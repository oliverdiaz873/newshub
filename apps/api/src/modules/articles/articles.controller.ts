import { Controller, Get, Headers, Inject, Param, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesQueryDto } from '../../common/dto/list-query.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';

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
}
