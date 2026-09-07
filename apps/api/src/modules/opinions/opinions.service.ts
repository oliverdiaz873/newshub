import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OpinionsRepository } from './opinions.repository';
import { AuthorsService } from '../authors/authors.service';
import { MediaRepository } from '../media/media.repository';
import type { CreateOpinionDto, UpdateOpinionDto } from '../editorial/dto/content-write.dto';
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
  firstPublishedAt: string | null;
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
    @Inject(MediaRepository) private readonly media: MediaRepository,
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

  // ---- Editorial writes (F3: draft-only, auth + RBAC at the controller) ----

  async create(dto: CreateOpinionDto, userId: string) {
    this.requireDraft(dto.status);
    this.requireSpanish(dto.translations);
    if (!(await this.authors.exists(dto.authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (dto.coverMediaId && !(await this.media.findById(dto.coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
    await this.assertSlugsFree(dto.translations);
    try {
      const row = await this.opinions.createWithTranslations({
        authorId: dto.authorId,
        coverMediaId: dto.coverMediaId ?? null,
        createdById: userId,
        translations: dto.translations,
      });
      return this.read(row.id);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateOpinionDto, userId: string) {
    const existing = await this.opinions.findByIdFull(id);
    if (!existing) throw new NotFoundException('Opinion not found.');
    this.requireDraft(dto.status);
    if (dto.authorId === null) {
      throw new UnprocessableEntityException('Author is required.');
    }
    if (dto.authorId !== undefined && !(await this.authors.exists(dto.authorId))) {
      throw new NotFoundException('Author not found.');
    }
    if (dto.coverMediaId !== undefined && dto.coverMediaId !== null && !(await this.media.findById(dto.coverMediaId))) {
      throw new NotFoundException('Media asset not found.');
    }
    if (dto.translations) {
      await this.assertSlugsFree(dto.translations, id);
      for (const t of dto.translations) {
        try {
          await this.opinions.upsertTranslation(id, t);
        } catch (err) {
          throw this.asSlugConflict(err);
        }
      }
    }
    await this.opinions.updateFields(id, {
      authorId: dto.authorId,
      coverMediaId: dto.coverMediaId,
      updatedById: userId,
    });
    const after = await this.opinions.findByIdFull(id);
    if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
    return this.read(id);
  }

  async remove(id: string) {
    const existing = await this.opinions.findByIdFull(id);
    if (!existing) throw new NotFoundException('Opinion not found.');
    await this.opinions.deleteById(id);
  }

  private requireDraft(status: string | undefined) {
    if (status !== undefined && status !== 'draft') {
      throw new UnprocessableEntityException('Only draft status is allowed in this slice (F4 owns transitions).');
    }
  }

  private requireSpanish(translations: Array<{ locale: string }>) {
    if (!translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
  }

  private async assertSlugsFree(
    translations: Array<{ locale: string; slug: string }>,
    excludeOpinionId?: string,
  ) {
    for (const t of translations) {
      const hit = await this.opinions.findTranslationBySlug(t.locale, t.slug);
      if (hit && hit.opinionId !== excludeOpinionId) {
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
    query: { page?: number; limit?: number; status?: string; author?: string; q?: string },
    locale: ResolvedLocale,
  ) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    let authorId: string | undefined;
    if (query.author) {
      const author = await this.opinions.findAuthorIdBySlug(query.author);
      if (!author) throw new NotFoundException('Author not found.');
      authorId = author.id;
    }
    const filters = { status: query.status, authorId, q: query.q?.trim() ? query.q.trim() : undefined };
    const total = await this.opinions.countAny(filters);
    const rows = await this.opinions.listAny(filters, (page - 1) * limit, limit);
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
    const row = await this.opinions.findByIdFull(id);
    if (!row) throw new NotFoundException('Opinion not found.');
    return {
      id: row.id,
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
