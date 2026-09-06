import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { AuthorsService } from '../authors/authors.service';
import { DEFAULT_LOCALE, ResolvedLocale } from '../../common/locale';
import { buildMeta, normalizePagination } from '../../common/pagination';

interface TranslationRow {
  locale: string;
  slug: string;
  title: string;
  summary: string;
  coverAlt: string | null;
  content: unknown;
}

export interface ArticleListItem {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  summary: string;
  cover: { url: string; alt: string } | null;
  author: { slug: string; name: string; bio: string | null } | null;
  firstPublishedAt: string;
  updatedAt: string;
  fallback: boolean;
}

export interface ArticleDetail extends ArticleListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: ArticleListItem[];
}

@Injectable()
export class ArticlesService {
  constructor(
    @Inject(ArticlesRepository) private readonly articles: ArticlesRepository,
    @Inject(AuthorsService) private readonly authors: AuthorsService,
  ) {}

  async list(
    query: { page?: number; limit?: number; category?: string; author?: string; q?: string; sort?: 'publishedAt:desc' | 'publishedAt:asc' },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const filters = await this.resolveFilters(query, locale);
    const total = await this.articles.countPublished(filters);
    const rows = await this.articles.listPublished(filters, (page - 1) * limit, limit);
    const data = await Promise.all(rows.map((row) => this.toListItem(row, locale)));
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async detail(slug: string, locale: ResolvedLocale): Promise<ArticleDetail & { localeRequested: string; localeResolved: string }> {
    const hit = await this.articles.findBySlug(slug, locale.resolved);
    if (!hit) {
      if (locale.resolved !== DEFAULT_LOCALE) {
        const es = await this.articles.findBySlug(slug, DEFAULT_LOCALE);
        if (es) return this.toDetail(es.article, locale, true, slug);
      }
      throw new NotFoundException('Article not found.');
    }
    return this.toDetail(hit.article, locale, false, slug);
  }

  private async resolveFilters(
    query: { category?: string; author?: string; q?: string; sort?: 'publishedAt:desc' | 'publishedAt:asc' },
    locale: ResolvedLocale,
  ) {
    let categoryId: string | undefined;
    if (query.category) {
      const cat = await this.articles.findCategoryIdBySlug(query.category, locale.resolved)
        ?? await this.articles.findCategoryIdBySlug(query.category, DEFAULT_LOCALE);
      if (!cat) throw new NotFoundException('Category not found.');
      categoryId = cat.categoryId;
    }
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.articles.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    return {
      categoryId,
      authorId,
      q: query.q?.trim() ? query.q.trim() : undefined,
      sort: query.sort ?? 'publishedAt:desc',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toListItem(row: any, locale: ResolvedLocale): Promise<ArticleListItem> {
    const translations = row.translations as TranslationRow[];
    const direct = translations.find((t) => t.locale === locale.resolved)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
    const usedLocale = direct?.locale ?? locale.resolved;
    const categorySlug = this.pickSlug(row.category?.translations ?? [], locale) ?? '';
    return {
      id: row.id as string,
      slug: direct?.slug ?? '',
      categorySlug,
      title: direct?.title ?? '',
      summary: direct?.summary ?? '',
      cover: row.cover ? {
        // F1: seeded legacy path doubles as public URL; generation mechanism stays open.
        url: row.cover.storageKey as string,
        alt: direct?.coverAlt ?? direct?.title ?? '',
      } : null,
      author: row.authorId ? await this.authors.viewFor(row.authorId as string, usedLocale) : null,
      firstPublishedAt: (row.publishedAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
      fallback: usedLocale !== locale.resolved,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toDetail(row: any, locale: ResolvedLocale, fallback: boolean, slug: string) {
    const translations = row.translations as TranslationRow[];
    const resolvedLocale = fallback ? DEFAULT_LOCALE : locale.resolved;
    const t = translations.find((x) => x.locale === resolvedLocale);
    if (!t || t.slug !== slug) throw new NotFoundException('Article not found.');
    const item = await this.toListItem(row, fallback
      ? { requested: locale.requested, resolved: DEFAULT_LOCALE, fallback: true }
      : locale);
    const relatedRows = await this.articles.findRelated(row.categoryId as string, row.id as string, 3);
    const related = await Promise.all(relatedRows.map((r) => this.toListItem(r, locale)));
    const categoryLabel = this.pickLabel(row.category?.translations ?? [], fallback ? DEFAULT_LOCALE : locale.resolved);
    return {
      ...item,
      fallback,
      content: Array.isArray(t.content) ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string') : [],
      breadcrumb: {
        home: locale.requested === 'en' ? 'Home' : 'Inicio',
        category: categoryLabel,
        current: t.title,
      },
      related,
      localeRequested: locale.requested,
      localeResolved: resolvedLocale,
    };
  }

  private pickSlug(translations: Array<{ locale: string; slug: string }>, locale: ResolvedLocale): string | undefined {
    return translations.find((t) => t.locale === locale.resolved)?.slug
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)?.slug;
  }

  private pickLabel(translations: Array<{ locale: string; label: string }>, locale: string): string {
    return translations.find((t) => t.locale === locale)?.label
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE)?.label ?? '';
  }
}
