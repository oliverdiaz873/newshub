import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Inject, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesQueryDto } from '../../common/dto/list-query.dto';
import { CreateArticleDto, UpdateArticleDto } from '../editorial/dto/content-write.dto';
import { BulkArticlesDto } from './dto/bulk.dto';
import { ScheduleDto } from '../scheduling/schedule.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';
import type { TransitionAction } from '../../common/transitions';
import { RejectDto } from '../../common/dto/reject.dto';

@Controller('articles')
export class ArticlesController {
  constructor(@Inject(ArticlesService) private readonly articles: ArticlesService) {}

  @Get()
  list(
    @Query(new DtoPipe(ArticlesQueryDto)) query: ArticlesQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.articles.list(query, resolveLocale(query.locale, acceptLanguage));
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Query('locale') locale: string | undefined,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.articles.detail(slug, resolveLocale(locale, acceptLanguage));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  create(
    @Body(new DtoPipe(CreateArticleDto)) dto: CreateArticleDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.articles.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  update(
    @Param('id') id: string,
    @Body(new DtoPipe(UpdateArticleDto)) dto: UpdateArticleDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.articles.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string, @CurrentUser() user: AccessClaims): Promise<void> {
    await this.articles.remove(id, user.sub);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  bulk(
    @Body(new DtoPipe(BulkArticlesDto)) dto: BulkArticlesDto,
    @CurrentUser() user: AccessClaims,
  ) {
    return this.articles.bulk(dto.action, dto.ids, user.sub);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  publish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.articles.transition(id, 'publish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  unpublish(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.articles.transition(id, 'unpublish' satisfies TransitionAction, user.sub);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  archive(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.articles.transition(id, 'archive' satisfies TransitionAction, user.sub);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  restore(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.articles.transition(id, 'restore' satisfies TransitionAction, user.sub);
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
    return this.articles.transition(id, 'reject' satisfies TransitionAction, user.sub, { reason: dto.reason });
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
    return this.articles.schedule(id, new Date(dto.scheduledAt), user.sub);
  }

  @Delete(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  unschedule(@Param('id') id: string, @CurrentUser() user: AccessClaims) {
    return this.articles.unschedule(id, user.sub);
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
    return this.articles.listRevisions(id, toInt(page), toInt(limit));
  }

  @Get(':id/revisions/:version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor', 'reviewer')
  getRevision(@Param('id') id: string, @Param('version', ParseIntPipe) version: number) {
    return this.articles.getRevision(id, version);
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
    return this.articles.restoreRevision(id, version, user.sub);
  }
}
