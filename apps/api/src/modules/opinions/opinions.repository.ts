import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface OpinionFilters {
  authorId?: string;
  q?: string;
  sort: 'publishedAt:desc' | 'publishedAt:asc';
}

export interface EditorialOpinionFilters {
  status?: string;
  authorId?: string;
  q?: string;
}

/**
 * Thin repository: published-only reads for the F1 public surface.
 * `q` is accent-insensitive ILIKE-level filtering via the `unaccent`
 * extension (see articles.repository.ts); `economia` matches `Economía`.
 */
@Injectable()
export class OpinionsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private baseWhere(filters: OpinionFilters): Prisma.OpinionWhereInput {
    const where: Prisma.OpinionWhereInput = { status: PUBLISHED };
    if (filters.authorId) where.authorId = filters.authorId;
    // NOTE: `q` is intentionally absent here. See articles.repository.ts:
    // every q-filtered read goes through findQIds()/countQ() (raw SQL with
    // the identical predicate for page and total).
    return where;
  }

  /**
   * Accent-insensitive q predicate over translation title/summary.
   * Shared by the COUNT and page-id queries so total and results can
   * never diverge.
   */
  private qMatch(q: string): Prisma.Sql {
    const pattern = `%${q}%`;
    return Prisma.sql`(unaccent("t"."title") ILIKE unaccent(${pattern}) OR unaccent("t"."summary") ILIKE unaccent(${pattern}))`;
  }

  private qPredicates(
    status: Prisma.Sql,
    filters: { authorId?: string; q: string },
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [status];
    if (filters.authorId) parts.push(Prisma.sql`o."author_id" = ${filters.authorId}::uuid`);
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "opinion_translations" "t" WHERE "t"."opinion_id" = o."id" AND ${this.qMatch(filters.q)})`,
    );
    return Prisma.join(parts, ' AND ');
  }

  private qWherePublished(filters: OpinionFilters & { q: string }): Prisma.Sql {
    return this.qPredicates(Prisma.sql`o."status" = ${PUBLISHED}`, filters);
  }

  private qWhereAny(filters: EditorialOpinionFilters & { q: string }): Prisma.Sql {
    return this.qPredicates(
      filters.status ? Prisma.sql`o."status" = ${filters.status}` : Prisma.sql`TRUE`,
      filters,
    );
  }

  private async findQIds(
    where: Prisma.Sql,
    order: Prisma.Sql,
    skip: number,
    take: number,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT o."id" AS id FROM "opinions" o WHERE ${where} ORDER BY ${order} LIMIT ${take} OFFSET ${skip}`,
    );
    return rows.map((r) => r.id);
  }

  private async countQ(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS count FROM "opinions" o WHERE ${where}`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async findByQIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.opinion.findMany({
      where: { id: { in: ids } },
      include: { translations: true, cover: true },
    });
    // findMany({ id: { in } }) does not preserve the raw search order.
    const order = new Map(ids.map((id, i) => [id, i] as const));
    rows.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));
    return rows;
  }

  countPublished(filters: OpinionFilters) {
    if (!filters.q) return this.prisma.opinion.count({ where: this.baseWhere(filters) });
    return this.countQ(this.qWherePublished({ ...filters, q: filters.q }));
  }

  listPublished(filters: OpinionFilters, skip: number, take: number) {
    if (!filters.q) {
      return this.prisma.opinion.findMany({
        where: this.baseWhere(filters),
        orderBy: { publishedAt: filters.sort === 'publishedAt:asc' ? 'asc' : 'desc' },
        skip,
        take,
        include: { translations: true, cover: true },
      });
    }
    const dir = filters.sort === 'publishedAt:asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');
    return this.findQIds(this.qWherePublished({ ...filters, q: filters.q }), Prisma.sql`o."published_at" ${dir}`, skip, take).then(
      (ids) => this.findByQIds(ids),
    );
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
    // NOTE: `q` is intentionally absent here (see baseWhere comment).
    return where;
  }

  countAny(filters: EditorialOpinionFilters) {
    if (!filters.q) return this.prisma.opinion.count({ where: this.editorialWhere(filters) });
    return this.countQ(this.qWhereAny({ ...filters, q: filters.q }));
  }

  listAny(filters: EditorialOpinionFilters, skip: number, take: number) {
    if (!filters.q) {
      return this.prisma.opinion.findMany({
        where: this.editorialWhere(filters),
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        skip,
        take,
        include: { translations: true, cover: true },
      });
    }
    // Mirrors the fluent ordering exactly: publishedAt DESC NULLS LAST,
    // then updatedAt DESC.
    const order = Prisma.sql`o."published_at" DESC NULLS LAST, o."updated_at" DESC`;
    return this.findQIds(this.qWhereAny({ ...filters, q: filters.q }), order, skip, take).then((ids) =>
      this.findByQIds(ids),
    );
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
    input: { authorId?: string; coverMediaId?: string | null; status?: string; updatedById: string },
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
        ...(input.status !== undefined ? { status: input.status } : {}),
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

  setStatus(id: string, input: { status: string; publishedAt?: Date | null; updatedById: string }) {
    return this.prisma.opinion.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
        updatedBy: { connect: { id: input.updatedById } },
      },
    });
  }
}
