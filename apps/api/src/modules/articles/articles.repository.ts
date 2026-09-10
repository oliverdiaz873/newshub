import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface ArticleFilters {
  categoryId?: string;
  authorId?: string;
  q?: string;
  sort: 'publishedAt:desc' | 'publishedAt:asc';
  breaking?: boolean;
  featured?: boolean;
}

export interface EditorialArticleFilters {
  status?: string;
  categoryId?: string;
  authorId?: string;
  q?: string;
  breaking?: boolean;
  featured?: boolean;
}

/**
 * Thin repository: published-only reads for the F1 public surface.
 * `q` is accent-insensitive ILIKE-level filtering via the `unaccent`
 * extension (migration 20260911000000): unaccent(title/summary) is
 * compared so `economia` matches `Economía`. Contract-stable otherwise
 * (contains semantics, title/summary only, tuning deferred).
 */
@Injectable()
export class ArticlesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private baseWhere(filters: ArticleFilters): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = { status: PUBLISHED };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.authorId) where.authorId = filters.authorId;
    if (filters.breaking !== undefined) where.isBreaking = filters.breaking;
    if (filters.featured !== undefined) where.isFeatured = filters.featured;
    // NOTE: `q` is intentionally absent here. Accent-insensitive matching
    // requires unaccent(), which Prisma cannot express fluently, so every
    // q-filtered read goes through findQIds()/countQ() below (raw SQL with
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
    filters: { categoryId?: string; authorId?: string; breaking?: boolean; featured?: boolean; q: string },
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [status];
    if (filters.categoryId) parts.push(Prisma.sql`a."category_id" = ${filters.categoryId}::uuid`);
    if (filters.authorId) parts.push(Prisma.sql`a."author_id" = ${filters.authorId}::uuid`);
    if (filters.breaking !== undefined) parts.push(Prisma.sql`a."is_breaking" = ${filters.breaking}`);
    if (filters.featured !== undefined) parts.push(Prisma.sql`a."is_featured" = ${filters.featured}`);
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "article_translations" "t" WHERE "t"."article_id" = a."id" AND ${this.qMatch(filters.q)})`,
    );
    return Prisma.join(parts, ' AND ');
  }

  private qWherePublished(filters: ArticleFilters & { q: string }): Prisma.Sql {
    return this.qPredicates(Prisma.sql`a."status" = ${PUBLISHED}`, filters);
  }

  private qWhereAny(filters: EditorialArticleFilters & { q: string }): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (filters.status) parts.push(Prisma.sql`a."status" = ${filters.status}`);
    return this.qPredicates(
      parts.length > 0 ? Prisma.join(parts, ' AND ') : Prisma.sql`TRUE`,
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
      Prisma.sql`SELECT a."id" AS id FROM "articles" a WHERE ${where} ORDER BY ${order} LIMIT ${take} OFFSET ${skip}`,
    );
    return rows.map((r) => r.id);
  }

  private async countQ(where: Prisma.Sql): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS count FROM "articles" a WHERE ${where}`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  private async findByQIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.article.findMany({
      where: { id: { in: ids } },
      include: {
        translations: true,
        cover: true,
        category: { include: { translations: true } },
      },
    });
    // findMany({ id: { in } }) does not preserve the raw search order.
    const order = new Map(ids.map((id, i) => [id, i] as const));
    rows.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0));
    return rows;
  }

  countPublished(filters: ArticleFilters) {
    if (!filters.q) return this.prisma.article.count({ where: this.baseWhere(filters) });
    return this.countQ(this.qWherePublished({ ...filters, q: filters.q }));
  }

  listPublished(filters: ArticleFilters, skip: number, take: number) {
    if (!filters.q) {
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
    const dir = filters.sort === 'publishedAt:asc' ? Prisma.raw('ASC') : Prisma.raw('DESC');
    return this.findQIds(this.qWherePublished({ ...filters, q: filters.q }), Prisma.sql`a."published_at" ${dir}`, skip, take).then(
      (ids) => this.findByQIds(ids),
    );
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
    if (filters.breaking !== undefined) where.isBreaking = filters.breaking;
    if (filters.featured !== undefined) where.isFeatured = filters.featured;
    // NOTE: `q` is intentionally absent here (see baseWhere comment).
    return where;
  }

  countAny(filters: EditorialArticleFilters) {
    if (!filters.q) return this.prisma.article.count({ where: this.editorialWhere(filters) });
    return this.countQ(this.qWhereAny({ ...filters, q: filters.q }));
  }

  listAny(filters: EditorialArticleFilters, skip: number, take: number) {
    if (!filters.q) {
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
    // Mirrors the fluent ordering exactly: publishedAt DESC NULLS LAST,
    // then updatedAt DESC.
    const order = Prisma.sql`a."published_at" DESC NULLS LAST, a."updated_at" DESC`;
    return this.findQIds(this.qWhereAny({ ...filters, q: filters.q }), order, skip, take).then((ids) =>
      this.findByQIds(ids),
    );
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
    input: { categoryId?: string; authorId?: string | null; coverMediaId?: string | null; status?: string; isBreaking?: boolean; isFeatured?: boolean; updatedById: string },
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
        ...(input.isBreaking !== undefined ? { isBreaking: input.isBreaking } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
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
