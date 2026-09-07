import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface ArticleFilters {
  categoryId?: string;
  authorId?: string;
  q?: string;
  sort: 'publishedAt:desc' | 'publishedAt:asc';
}

export interface EditorialArticleFilters {
  status?: string;
  categoryId?: string;
  authorId?: string;
  q?: string;
}

/**
 * Thin repository: published-only reads for the F1 public surface.
 * `q` is basic ILIKE-level filtering (contract-stable, tuning deferred).
 */
@Injectable()
export class ArticlesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private baseWhere(filters: ArticleFilters): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = { status: PUBLISHED };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.q) {
      // F1 basic: accent-sensitive ILIKE. Accent-insensitive search (unaccent/pg_trgm)
      // is deferred to the future search evolution; the `q` param shape stays stable.
      where.translations = {
        some: {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { summary: { contains: filters.q, mode: 'insensitive' } },
          ],
        },
      };
    }
    return where;
  }

  countPublished(filters: ArticleFilters) {
    return this.prisma.article.count({ where: this.baseWhere(filters) });
  }

  listPublished(filters: ArticleFilters, skip: number, take: number) {
    return this.prisma.article.findMany({
      where: this.baseWhere(filters),
      orderBy: { publishedAt: filters.sort === 'publishedAt:asc' ? 'asc' : 'desc' },
      skip,
      take,
      include: {
        translations: true,
        cover: true,
        category: { include: { translations: true } },
      },
    });
  }

  findBySlug(slug: string, locale: string) {
    return this.prisma.articleTranslation.findFirst({
      where: { slug, locale, article: { status: PUBLISHED } },
      include: {
        article: {
          include: {
            translations: true,
            cover: true,
            category: { include: { translations: true } },
          },
        },
      },
    });
  }

  findRelated(categoryId: string, excludeId: string, take: number) {
    return this.prisma.article.findMany({
      where: { categoryId, status: PUBLISHED, id: { not: excludeId } },
      orderBy: { publishedAt: 'desc' },
      take,
      include: { translations: true, cover: true },
    });
  }

  findCategoryIdBySlug(slug: string, locale: string) {
    return this.prisma.categoryTranslation.findFirst({
      where: { slug, locale },
      select: { categoryId: true },
    });
  }

  findAuthorIdBySlug(slug: string) {
    return this.prisma.author.findUnique({ where: { slug }, select: { id: true } });
  }

  private editorialWhere(filters: EditorialArticleFilters): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.q) {
      where.translations = {
        some: {
          OR: [
            { title: { contains: filters.q, mode: 'insensitive' } },
            { summary: { contains: filters.q, mode: 'insensitive' } },
          ],
        },
      };
    }
    return where;
  }

  countAny(filters: EditorialArticleFilters) {
    return this.prisma.article.count({ where: this.editorialWhere(filters) });
  }

  listAny(filters: EditorialArticleFilters, skip: number, take: number) {
    return this.prisma.article.findMany({
      where: this.editorialWhere(filters),
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
      skip,
      take,
      include: {
        translations: true,
        cover: true,
        category: { include: { translations: true } },
      },
    });
  }

  findByIdFull(id: string) {
    return this.prisma.article.findUnique({
      where: { id },
      include: {
        translations: true,
        cover: true,
        category: { include: { translations: true } },
      },
    });
  }

  findTranslationBySlug(locale: string, slug: string) {
    return this.prisma.articleTranslation.findUnique({
      where: { locale_slug: { locale, slug } },
      select: { articleId: true },
    });
  }

  createWithTranslations(input: {
    categoryId: string;
    authorId?: string | null;
    coverMediaId?: string | null;
    createdById: string;
    translations: Array<{ locale: string; slug: string; title: string; summary: string; coverAlt?: string | null; content: string[] }>;
  }) {
    return this.prisma.article.create({
      data: {
        categoryId: input.categoryId,
        authorId: input.authorId ?? null,
        coverMediaId: input.coverMediaId ?? null,
        status: 'draft',
        createdById: input.createdById,
        updatedById: input.createdById,
        translations: {
          create: input.translations.map((t) => ({
            locale: t.locale,
            slug: t.slug,
            title: t.title,
            summary: t.summary,
            coverAlt: t.coverAlt ?? null,
            content: t.content,
          })),
        },
      },
      select: { id: true },
    });
  }

  updateFields(
    id: string,
    input: { categoryId?: string; authorId?: string | null; coverMediaId?: string | null; status?: string; updatedById: string },
  ) {
    return this.prisma.article.update({
      where: { id },
      data: {
        ...(input.categoryId !== undefined ? { category: { connect: { id: input.categoryId } } } : {}),
        ...(input.authorId !== undefined
          ? input.authorId === null
            ? { author: { disconnect: true } }
            : { author: { connect: { id: input.authorId } } }
          : {}),
        ...(input.coverMediaId !== undefined
          ? input.coverMediaId === null
            ? { cover: { disconnect: true } }
            : { cover: { connect: { id: input.coverMediaId } } }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedBy: { connect: { id: input.updatedById } },
      },
    });
  }

  upsertTranslation(
    articleId: string,
    t: { locale: string; slug: string; title: string; summary: string; coverAlt?: string | null; content: string[] },
  ) {
    return this.prisma.articleTranslation.upsert({
      where: { articleId_locale: { articleId, locale: t.locale } },
      update: { slug: t.slug, title: t.title, summary: t.summary, coverAlt: t.coverAlt ?? null, content: t.content },
      create: {
        articleId, locale: t.locale, slug: t.slug, title: t.title,
        summary: t.summary, coverAlt: t.coverAlt ?? null, content: t.content,
      },
    });
  }

  deleteById(id: string) {
    return this.prisma.article.delete({ where: { id } });
  }

  setStatus(id: string, input: { status: string; publishedAt?: Date | null; updatedById: string }) {
    return this.prisma.article.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
        updatedBy: { connect: { id: input.updatedById } },
      },
    });
  }
}
