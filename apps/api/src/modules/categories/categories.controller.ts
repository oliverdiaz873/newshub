import { Controller, Get, Headers, Inject, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { resolveLocale } from '../../common/locale';

@Controller('categories')
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: ListQueryDto, @Headers('accept-language') acceptLanguage?: string) {
    return this.categories.list(query, resolveLocale(query.locale, acceptLanguage));
  }

  @Get(':slug')
  detail(
    @Param('slug') slug: string,
    @Query('locale') locale: string | undefined,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.categories.detail(slug, resolveLocale(locale, acceptLanguage));
  }
}
