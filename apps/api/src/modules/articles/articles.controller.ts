import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesQueryDto } from '../../common/dto/list-query.dto';
import { CreateArticleDto, UpdateArticleDto } from '../editorial/dto/content-write.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { AccessClaims } from '../auth/tokens';

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
  async remove(@Param('id') id: string): Promise<void> {
    await this.articles.remove(id);
  }
}
