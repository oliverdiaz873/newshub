import { Controller, Get, Headers, Inject, Param, Query } from '@nestjs/common';
import { OpinionsService } from './opinions.service';
import { OpinionsQueryDto } from '../../common/dto/list-query.dto';
import { resolveLocale } from '../../common/locale';
import { DtoPipe } from '../../common/http/validation';

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
}
