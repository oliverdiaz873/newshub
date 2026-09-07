import { Controller, Get, Headers, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ArticlesService } from '../articles/articles.service';
import { OpinionsService } from '../opinions/opinions.service';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DtoPipe } from '../../common/http/validation';
import { resolveLocale } from '../../common/locale';
import { EditorialArticlesQueryDto, EditorialOpinionsQueryDto } from './dto/editorial-query.dto';

/**
 * Editorial reading surface (F3): any status, full translations for forms.
 * Strictly auth-guarded — the public surface stays published-only.
 */
@Controller('editorial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
export class EditorialController {
  constructor(
    @Inject(ArticlesService) private readonly articles: ArticlesService,
    @Inject(OpinionsService) private readonly opinions: OpinionsService,
  ) {}

  @Get('articles')
  listArticles(
    @Query(new DtoPipe(EditorialArticlesQueryDto)) query: EditorialArticlesQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.articles.listEditorial(query, resolveLocale(query.locale, acceptLanguage));
  }

  @Get('articles/:id')
  readArticle(@Param('id') id: string) {
    return this.articles.read(id);
  }

  @Get('opinions')
  listOpinions(
    @Query(new DtoPipe(EditorialOpinionsQueryDto)) query: EditorialOpinionsQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.opinions.listEditorial(query, resolveLocale(query.locale, acceptLanguage));
  }

  @Get('opinions/:id')
  readOpinion(@Param('id') id: string) {
    return this.opinions.read(id);
  }
}
