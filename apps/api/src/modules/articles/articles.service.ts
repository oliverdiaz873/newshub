import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ArticlesRepository } from './articles.repository';
import { AuthorsService } from '../authors/authors.service';
import { CategoriesService } from '../categories/categories.service';
import { MediaRepository } from '../media/media.repository';
import type { CreateArticleDto, UpdateArticleDto } from '../editorial/dto/content-write.dto';
import { DEFAULT_LOCALE, ResolvedLocale } from '../../common/locale';
import { buildMeta, normalizePagination } from '../../common/pagination';
import { resolveTransition, type TransitionAction } from '../../common/transitions';

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
  firstPublishedAt: string | null;
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
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(MediaRepository) private readonly media: MediaRepository,
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

  async detail(slug: string, locale: ResolvedLocale): Promise<ArticleDetail & { localeRequested: string; localeResolved: string }> {    const hit = await this.articles.findBySlug(slug, locale.resolved);
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
      firstPublishedAt: row.publishedAt ? (row.publishedAt as Date).toISOString() : null,
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

  // ---- Editorial writes (F3: draft-only, auth + RBAC at the controller) ----

  async create(dto: CreateArticleDto, userId: string) {
    this.requireCreateDraft(dto.status);
    this.requireSpanish(dto.translations);
    await this.assertReferences(dto.categoryId, dto.authorId, dto.coverMediaId);
    await this.assertSlugsFree(dto.translations);
    try {
      const row = await this.articles.createWithTranslations({
        categoryId: dto.categoryId,
        authorId: dto.authorId ?? null,
        coverMediaId: dto.coverMediaId ?? null,
        createdById: userId,
        translations: dto.translations,
      });
      return this.read(row.id);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateArticleDto, userId: string) {
    const existing = await this.articles.findByIdFull(id);
    if (!existing) throw new NotFoundException('Article not found.');
    const targetStatus = this.resolvePatchStatus(existing.status, dto.status);
    if (dto.categoryId !== undefined && !(await this.categories.exists(dto.categoryId))) {
      throw new NotFoundException('Category not found.');
    }
    if (dto.authorId !== undefined && dto.authorId !== null && !(await this.authors.exists(dto.authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (dto.coverMediaId !== undefined && dto.coverMediaId !== null && !(await this.media.findById(dto.coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
    if (dto.translations) {
      await this.assertSlugsFree(dto.translations, id);
      for (const t of dto.translations) {
        try {
          await this.articles.upsertTranslation(id, t);
        } catch (err) {
          throw this.asSlugConflict(err);
        }
      }
    }
    await this.articles.updateFields(id, {
      categoryId: dto.categoryId,
      authorId: dto.authorId,
      coverMediaId: dto.coverMediaId,
      status: targetStatus,
      updatedById: userId,
    });
    const after = await this.articles.findByIdFull(id);
    if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
    return this.read(id);
  }

  async remove(id: string) {
    const existing = await this.articles.findByIdFull(id);
    if (!existing) throw new NotFoundException('Article not found.');
    await this.articles.deleteById(id);
  }

  /**
   * Publishing transitions (F4). `firstPublishedAt` is set once on the first
   * publish and never rewritten; unpublish keeps history; audit tracks the actor.
   */
  async transition(id: string, action: TransitionAction, userId: string) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    const target = resolveTransition(row.status, action);
    if (target === null) return this.read(id);
    if (action === 'publish' && !row.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required to publish.');
    }
    await this.articles.setStatus(id, {
      status: target,
      publishedAt: action === 'publish' && !row.publishedAt ? new Date() : undefined,
      updatedById: userId,
    });
    return this.read(id);
  }

  /**
   * PATCH status policy (documented F3 exception): only `review` may be set,
   * and only from `draft` (idempotent when already `review`). Anything else
   * must go through the transition endpoints.
   */
  private resolvePatchStatus(current: string, requested: string | undefined): string | undefined {
    if (requested === undefined || requested === 'draft') {
      if (requested === 'draft' && current !== 'draft') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot set status to 'draft' from '${current}'. Use the transition endpoints.`,
        });
      }
      return undefined;
    }
    if (requested === 'review') {
      if (current === 'review') return undefined;
      if (current !== 'draft') {
        throw new ConflictException({
          code: 'invalid_transition',
          error: 'Conflict',
          message: `Cannot set status to 'review' from '${current}'.`,
        });
      }
      return 'review';
    }
    throw new UnprocessableEntityException('Only draft or review status is allowed via PATCH (F4 owns transitions).');
  }

  private requireCreateDraft(status: string | undefined) {
    if (status !== undefined && status !== 'draft') {
      throw new UnprocessableEntityException('Only draft status is allowed on create (F4 owns transitions).');
    }
  }

  private requireSpanish(translations: Array<{ locale: string }>) {
    if (!translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
  }

  private async assertReferences(categoryId: string, authorId?: string | null, coverMediaId?: string | null) {
    if (!(await this.categories.exists(categoryId))) {
      throw new NotFoundException('Category not found.');
    }
    if (authorId && !(await this.authors.exists(authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (coverMediaId && !(await this.media.findById(coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
  }

  private async assertSlugsFree(
    translations: Array<{ locale: string; slug: string }>,
    excludeArticleId?: string,
  ) {
    for (const t of translations) {
      const hit = await this.articles.findTranslationBySlug(t.locale, t.slug);
      if (hit && hit.articleId !== excludeArticleId) {
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

  // ---- Editorial reads (auth enforced at the editorial controller) ----

  async listEditorial(
    query: { page?: number; limit?: number; status?: string; category?: string; author?: string; q?: string },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const filters = await this.resolveFilters(query, locale);
    const total = await this.articles.countAny({ ...filters, status: query.status });
    const rows = await this.articles.listAny({ ...filters, status: query.status }, (page - 1) * limit, limit);
    const data = await Promise.all(
      rows.map(async (row) => ({ ...(await this.toListItem(row, locale)), status: row.status as string })),
    );
    return {
      data,
      meta: buildMeta(page, limit, total),
      localeRequested: locale.requested,
      localeResolved: locale.resolved,
      fallback: data.some((item) => item.fallback),
    };
  }

  async read(id: string) {
    const row = await this.articles.findByIdFull(id);
    if (!row) throw new NotFoundException('Article not found.');
    return {
      id: row.id,
      categoryId: row.categoryId,
      authorId: row.authorId,
      coverMediaId: row.coverMediaId,
      status: row.status,
      firstPublishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      translations: row.translations.map((t) => ({
        locale: t.locale,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        coverAlt: t.coverAlt,
        content: Array.isArray(t.content)
          ? (t.content as unknown[]).filter((p): p is string => typeof p === 'string')
          : [],
      })),
    };
  }
}
