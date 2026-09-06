import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category-write.dto';
import { resolveLocale } from '../../common/locale';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { DtoPipe } from '../../common/http/validation';
import type { AccessClaims } from '../auth/tokens';

@Controller('categories')
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get()
  list(
    @Query(new DtoPipe(ListQueryDto)) query: ListQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
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

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  create(
    @Body(new DtoPipe(CreateCategoryDto)) dto: CreateCategoryDto,
    @CurrentUser() user: AccessClaims,
    @Query('locale') locale: string | undefined,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.categories.create(dto, user.sub, resolveLocale(locale, acceptLanguage));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  update(
    @Param('id') id: string,
    @Body(new DtoPipe(UpdateCategoryDto)) dto: UpdateCategoryDto,
    @CurrentUser() user: AccessClaims,
    @Query('locale') locale: string | undefined,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.categories.update(id, dto, user.sub, resolveLocale(locale, acceptLanguage));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  async remove(@Param('id') id: string): Promise<void> {
    await this.categories.remove(id);
  }
}
