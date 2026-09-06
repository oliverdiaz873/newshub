import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
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
  ): Promise<CategoryDetail & { localeRequested: string; localeResolved: string; fallback: boolean }> {
    const hit = await this.categories.findBySlugWithTranslations(slug, locale.resolved);
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
}
