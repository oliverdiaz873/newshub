import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OpinionsRepository } from './opinions.repository';
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

export interface OpinionListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: { url: string; alt: string } | null;
  author: { slug: string; name: string; bio: string | null };
  firstPublishedAt: string;
  updatedAt: string;
  fallback: boolean;
}

export interface OpinionDetail extends OpinionListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: OpinionListItem[];
}

@Injectable()
export class OpinionsService {
  constructor(
    @Inject(OpinionsRepository) private readonly opinions: OpinionsRepository,
    @Inject(AuthorsService) private readonly authors: AuthorsService,
  ) {}

  async list(
    query: { page?: number; limit?: number; author?: string; q?: string },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.opinions.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    const filters = { authorId, q: query.q?.trim() ? query.q.trim() : undefined };
    const total = await this.opinions.countPublished(filters);
    const rows = await this.opinions.listPublished(filters, (page - 1) * limit, limit);
    const data = await Promise.all(rows.map((row) => this.toListItem(row, locale)));
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async detail(slug: string, locale: ResolvedLocale): Promise<OpinionDetail & { localeRequested: string; localeResolved: string }> {
    const hit = await this.opinions.findBySlug(slug, locale.resolved);
    if (!hit) {
      if (locale.resolved !== DEFAULT_LOCALE) {
        const es = await this.opinions.findBySlug(slug, DEFAULT_LOCALE);
        if (es) return this.toDetail(es.opinion, locale, true, slug);
      }
      throw new NotFoundException('Opinion not found.');
    }
    return this.toDetail(hit.opinion, locale, false, slug);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async toListItem(row: any, locale: ResolvedLocale): Promise<OpinionListItem> {
    const translations = row.translations as TranslationRow[];
    const direct = translations.find((t) => t.locale === locale.resolved)
      ?? translations.find((t) => t.locale === DEFAULT_LOCALE);
    const usedLocale = direct?.locale ?? locale.resolved;
    const author = await this.authors.viewFor(row.authorId as string, usedLocale);
    if (!author) throw new NotFoundException('Author not found.');
    return {
      id: row.id as string,
      slug: direct?.slug ?? '',
      title: direct?.title ?? '',
      summary: direct?.summary ?? '',
      cover: row.cover ? {
        url: row.cover.storageKey as string,
        alt: direct?.coverAlt ?? direct?.title ?? '',
      } : null,
      author,
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
    if (!t || t.slug !== slug) throw new NotFoundException('Opinion not found.');
    const item = await this.toListItem(row, fallback
      ? { requested: locale.requested, resolved: DEFAULT_LOCALE, fallback: true }
      : locale);
    const relatedRows = await this.opinions.findRelated(row.id as string, 3);
    const related = await Promise.all(relatedRows.map((r) => this.toListItem(r, locale)));
    return {
      ...item,
      fallback,
      content: Array.isArray(t.content) ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string') : [],
      breadcrumb: {
        home: locale.requested === 'en' ? 'Home' : 'Inicio',
        category: locale.requested === 'en' ? 'Opinion' : 'Opinión',
        current: t.title,
      },
      related,
      localeRequested: locale.requested,
      localeResolved: resolvedLocale,
    };
  }
}
