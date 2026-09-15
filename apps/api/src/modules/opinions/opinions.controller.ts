import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Inject, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OpinionsService } from './opinions.service';
import { OpinionsQueryDto } from '../../common/dto/list-query.dto';
import { CreateOpinionDto, UpdateOpinionDto } from '../editorial/dto/content-write.dto';
import { ScheduleDto } from '../scheduling/schedule.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';
import type { TransitionAction } from '../../common/transitions';
import { RejectDto } from '../../common/dto/reject.dto';

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
  async remove(@Param('id') id: string, @CurrentUser() user: AccessClaims): Promise<void> {
    await this.opinions.remove(id, user.sub);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  publish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'publish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  unpublish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'unpublish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  archive(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'archive' satisfies TransitionAction, user.sub);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  restore(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.transition(id, 'restore' satisfies TransitionAction, user.sub);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AccessClaims,
    @Body(new DtoPipe(RejectDto)) dto: RejectDto,
  ) {
    return this.opinions.transition(id, 'reject' satisfies TransitionAction, user.sub, { reason: dto.reason });
  }

  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  schedule(
    @Param('id') id: string,
    @Body(new DtoPipe(ScheduleDto)) dto: ScheduleDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.opinions.schedule(id, new Date(dto.scheduledAt), user.sub);
  }

  @Delete(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  unschedule(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.opinions.unschedule(id, user.sub);
  }

  @Get(':id/revisions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  listRevisions(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const toInt = (value: string | undefined) => {
      if (value === undefined) return undefined;
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    };
    return this.opinions.listRevisions(id, toInt(page), toInt(limit));
  }

  @Get(':id/revisions/:version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  getRevision(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.opinions.getRevision(id, version);
  }

  @Post(':id/revisions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  restoreRevision(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.opinions.restoreRevision(id, version, user.sub);
  }
}
