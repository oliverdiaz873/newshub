import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OpinionsService } from './opinions.service';
import { OpinionsQueryDto } from '../../common/dto/list-query.dto';
import { CreateOpinionDto, UpdateOpinionDto } from '../editorial/dto/content-write.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';
import type { TransitionAction } from '../../common/transitions';

@Controller('opinions')
export class OpinionsController {
  constructor(@Inject(OpinionsService) private readonly opinions: OpinionsService) {}

  @Get()
  list(
    @Query(new DtoPipe(OpinionsQueryDto)) query: OpinionsQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.opinions.list(query, resolveLocale(query.locale, acceptLanguage));
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Query('locale') locale: string | undefined,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.opinions.detail(slug, resolveLocale(locale, acceptLanguage));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  create(
    @Body(new DtoPipe(CreateOpinionDto)) dto: CreateOpinionDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.opinions.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  update(
    @Param('id') id: string,
    @Body(new DtoPipe(UpdateOpinionDto)) dto: UpdateOpinionDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.opinions.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string): Promise<void> {
    await this.opinions.remove(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  publish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'publish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  unpublish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'unpublish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  archive(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'archive' satisfies TransitionAction, user.sub);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  restore(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'restore' satisfies TransitionAction, user.sub);
  }
}
