import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface OpinionFilters {
  authorId?: string;
  q?: string;
}

/**
 * Thin repository: published-only reads for the F1 public surface.
 */
@Injectable()
export class OpinionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private baseWhere(filters: OpinionFilters): Prisma.OpinionWhereInput {
    const where: Prisma.OpinionWhereInput = { status: PUBLISHED };
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.q) {
      // F1 basic: accent-sensitive ILIKE (see articles.repository.ts note).
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

  countPublished(filters: OpinionFilters) {
    return this.prisma.opinion.count({ where: this.baseWhere(filters) });
  }

  listPublished(filters: OpinionFilters, skip: number, take: number) {
    return this.prisma.opinion.findMany({
      where: this.baseWhere(filters),
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
      include: { translations: true, cover: true },
    });
  }

  findBySlug(slug: string, locale: string) {
    return this.prisma.opinionTranslation.findFirst({
      where: { slug, locale, opinion: { status: PUBLISHED } },
      include: { opinion: { include: { translations: true, cover: true } } },
    });
  }

  findRelated(excludeId: string, take: number) {
    return this.prisma.opinion.findMany({
      where: { status: PUBLISHED, id: { not: excludeId } },
      orderBy: { publishedAt: 'desc' },
      take,
      include: { translations: true, cover: true },
    });
  }

  findAuthorIdBySlug(slug: string) {
    return this.prisma.author.findUnique({ where: { slug }, select: { id: true } });
  }
}
