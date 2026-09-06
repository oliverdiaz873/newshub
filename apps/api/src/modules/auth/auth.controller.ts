import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DtoPipe } from '../../common/http/validation';
import { refreshTtlMs, type AccessClaims } from './tokens';

const REFRESH_COOKIE = 'nh_refresh';

/** Secure only in production so local HTTP dev keeps working (ADR-010). */
function cookieFlags(): { secure: boolean; sameSite: 'lax' } {
  return { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' };
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body(new DtoPipe(LoginDto)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(dto.email, dto.password);
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      ...cookieFlags(),
      path: '/api/v1/auth',
      maxAge: refreshTtlMs(),
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      ...cookieFlags(),
      path: '/api/v1/auth',
      maxAge: refreshTtlMs(),
    });
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AccessClaims) {
    return this.auth.me(user.sub);
  }
}
