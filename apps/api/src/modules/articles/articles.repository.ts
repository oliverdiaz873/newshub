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
}
