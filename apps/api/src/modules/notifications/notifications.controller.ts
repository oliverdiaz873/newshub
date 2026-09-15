import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DtoPipe } from '../../common/http/validation';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';
import type { AccessClaims } from '../auth/tokens';

export class PrefsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mutedTypes?: string[];
}

/**
 * Own-inbox reads. Every query is scoped to the authenticated user id from
 * the JWT — there is no userId parameter to spoof. `readAt` is the only
 * mutation surface; notification rows are otherwise immutable.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor', 'reviewer')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Get()
  inbox(
    @CurrentUser() user: AccessClaims,
    @Query(new DtoPipe(ListQueryDto)) query: ListQueryDto,
  ) {
    return this.notifications.inbox(user.sub, query.page, query.limit);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AccessClaims) {
    return this.notifications.unreadCount(user.sub);
  }

  @Get('prefs')
  prefs(@CurrentUser() user: AccessClaims) {
    return this.notifications.prefs(user.sub);
  }

  @Post('prefs')
  @HttpCode(HttpStatus.OK)
  setPrefs(@CurrentUser() user: AccessClaims, @Body(new DtoPipe(PrefsDto)) dto: PrefsDto) {
    return this.notifications.setPrefs(user.sub, dto.mutedTypes ?? []);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@CurrentUser() user: AccessClaims) {
    return this.notifications.markAllRead(user.sub);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: AccessClaims, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
