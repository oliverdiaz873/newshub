import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface OpinionFilters {
  authorId?: string;
  q?: string;
}

export interface EditorialOpinionFilters {
  status?: string;
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

  private editorialWhere(filters: EditorialOpinionFilters): Prisma.OpinionWhereInput {
    const where: Prisma.OpinionWhereInput = {};
    if (filters.status) where.status = filters.status;
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

  countAny(filters: EditorialOpinionFilters) {
    return this.prisma.opinion.count({ where: this.editorialWhere(filters) });
  }

  listAny(filters: EditorialOpinionFilters, skip: number, take: number) {
    return this.prisma.opinion.findMany({
      where: this.editorialWhere(filters),
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
      skip,
      take,
      include: { translations: true, cover: true },
    });
  }

  findByIdFull(id: string) {
    return this.prisma.opinion.findUnique({
      where: { id },
      include: { translations: true, cover: true },
    });
  }

  findTranslationBySlug(locale: string, slug: string) {
    return this.prisma.opinionTranslation.findUnique({
      where: { locale_slug: { locale, slug } },
      select: { opinionId: true },
    });
  }

  createWithTranslations(input: {
    authorId: string;
    coverMediaId?: string | null;
    createdById: string;
    translations: Array<{ locale: string; slug: string; title: string; summary: string; coverAlt?: string | null; content: string[] }>;
  }) {
    return this.prisma.opinion.create({
      data: {
        authorId: input.authorId,
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
    input: { authorId?: string; coverMediaId?: string | null; updatedById: string },
  ) {
    return this.prisma.opinion.update({
      where: { id },
      data: {
        ...(input.authorId !== undefined ? { author: { connect: { id: input.authorId } } } : {}),
        ...(input.coverMediaId !== undefined
          ? input.coverMediaId === null
            ? { cover: { disconnect: true } }
            : { cover: { connect: { id: input.coverMediaId } } }
          : {}),
        updatedBy: { connect: { id: input.updatedById } },
      },
    });
  }

  upsertTranslation(
    opinionId: string,
    t: { locale: string; slug: string; title: string; summary: string; coverAlt?: string | null; content: string[] },
  ) {
    return this.prisma.opinionTranslation.upsert({
      where: { opinionId_locale: { opinionId, locale: t.locale } },
      update: { slug: t.slug, title: t.title, summary: t.summary, coverAlt: t.coverAlt ?? null, content: t.content },
      create: {
        opinionId, locale: t.locale, slug: t.slug, title: t.title,
        summary: t.summary, coverAlt: t.coverAlt ?? null, content: t.content,
      },
    });
  }

  deleteById(id: string) {
    return this.prisma.opinion.delete({ where: { id } });
  }
}
