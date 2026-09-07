import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesRepository } from './categories.repository';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category-write.dto';
import { DEFAULT_LOCALE, ResolvedLocale } from '../../common/locale';
import { buildMeta, normalizePagination } from '../../common/pagination';

export interface CategoryListItem {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
}

export interface CategoryDetail extends CategoryListItem {
  articleCount: number;
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(CategoriesRepository) private readonly categories: CategoriesRepository) {}

  async list(query: { page?: number; limit?: number }, locale: ResolvedLocale) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const total = await this.categories.countPublished();
    const rows = await this.categories.listPublished((page - 1) * limit, limit);
    const data = rows.map((row) => {
      const { item, usedLocale } = this.pick(row.translations, row, locale);
      return { ...item, fallback: usedLocale !== locale.resolved };
    });
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async detail(
    slug: string,
    locale: ResolvedLocale,
  ): Promise<CategoryDetail & { localeRequested: string; localeResolved: string; fallback: boolean }> {    const hit = await this.categories.findBySlugWithTranslations(slug, locale.resolved);
    if (!hit) {
      if (locale.resolved !== DEFAULT_LOCALE) {
        const es = await this.categories.findBySlugWithTranslations(slug, DEFAULT_LOCALE);
        if (es) return this.shape(es.category.translations, es.category, locale, true, slug);
      }
      throw new NotFoundException('Category not found.');
    }
    return this.shape(hit.category.translations, hit.category, locale, false, slug);
  }

  private pick(
    translations: Array<{ locale: string; slug: string; label: string; description: string | null }>,
    row: { id: string; sort: number },
    locale: ResolvedLocale,
  ): { item: CategoryListItem; usedLocale: string } {
    const direct = translations.find((t) => t.locale === locale.resolved)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
    const usedLocale = direct?.locale ?? locale.resolved;
    return {
      item: {
        id: row.id,
        slug: direct?.slug ?? '',
        label: direct?.label ?? '',
        description: direct?.description ?? null,
        sort: row.sort,
      },
      usedLocale,
    };
  }

  private async shape(
    translations: Array<{ locale: string; slug: string; label: string; description: string | null }>,
    row: { id: string; sort: number },
    locale: ResolvedLocale,
    fallback: boolean,
    slug: string,
  ) {
    // Guard: the requested slug must belong to the resolved translation row.
    const resolved = translations.find((t) => t.locale === (fallback ? DEFAULT_LOCALE : locale.resolved));
    if (!resolved || resolved.slug !== slug) throw new NotFoundException('Category not found.');
    const item = this.pick(translations, row, fallback
      ? { requested: locale.requested, resolved: DEFAULT_LOCALE, fallback: true }
      : locale).item;
    return {
      ...item,
      articleCount: await this.categories.countPublishedArticles(row.id),
      localeRequested: locale.requested,
      localeResolved: fallback ? DEFAULT_LOCALE : locale.resolved,
      fallback,
    };
  }

  // ---- Editorial writes (F2, auth + RBAC enforced at the controller) ----

  async exists(id: string): Promise<boolean> {
    return (await this.categories.findByIdWithTranslations(id)) !== null;
  }

  async create(dto: CreateCategoryDto, userId: string, locale: ResolvedLocale) {
    this.requireSpanish(dto.translations);
    await this.assertSlugsFree(dto.translations);
    try {
      const row = await this.categories.createWithTranslations({
        sort: dto.sort ?? 0,
        createdById: userId,
        translations: dto.translations,
      });
      return this.read(row.id, locale);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string, locale: ResolvedLocale) {
    const existing = await this.categories.findByIdWithTranslations(id);
    if (!existing) throw new NotFoundException('Category not found.');
    if (dto.translations) {
      await this.assertSlugsFree(dto.translations, id);
      for (const t of dto.translations) {
        try {
          await this.categories.upsertTranslation(id, t);
        } catch (err) {
          throw this.asSlugConflict(err);
        }
      }
    }
    await this.categories.updateCategory(id, { sort: dto.sort, updatedById: userId });
    const after = await this.categories.findByIdWithTranslations(id);
    if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
    return this.read(id, locale);
  }

  async remove(id: string) {
    const existing = await this.categories.findByIdWithTranslations(id);
    if (!existing) throw new NotFoundException('Category not found.');
    if ((await this.categories.countAllArticles(id)) > 0) {
      throw new ConflictException('Category still has articles.');
    }
    await this.categories.deleteCategory(id);
  }

  private async read(id: string, locale: ResolvedLocale) {
    const row = await this.categories.findByIdWithTranslations(id);
    if (!row) throw new NotFoundException('Category not found.');
    const { item, usedLocale } = this.pick(row.translations, row, locale);
    return {
      ...item,
      articleCount: await this.categories.countPublishedArticles(row.id),
      localeRequested: locale.requested,
      localeResolved: usedLocale,
      fallback: usedLocale !== locale.resolved,
    };
  }

  private requireSpanish(translations: Array<{ locale: string }>) {
    if (!translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
  }

  private async assertSlugsFree(
    translations: Array<{ locale: string; slug: string }>,
    excludeCategoryId?: string,
  ) {
    for (const t of translations) {
      const hit = await this.categories.findTranslationBySlug(t.locale, t.slug);
      if (hit && hit.categoryId !== excludeCategoryId) {
        throw new ConflictException({
          code: 'slug_taken',
          error: 'Conflict',
          message: `Slug '${t.slug}' is already taken for locale '${t.locale}'.`,
        });
      }
    }
  }

  private asSlugConflict(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException({
        code: 'slug_taken',
        error: 'Conflict',
        message: 'Slug is already taken for this locale.',
      });
    }
    throw err;
  }
}
