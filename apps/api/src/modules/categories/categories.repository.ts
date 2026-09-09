import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

export interface CategoryTranslationData {
  locale: string;
  slug: string;
  label: string;
  description?: string | null;
}

/**
 * Thin repository: published-only reads for the F1 public surface.
 */
@Injectable()
export class CategoriesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  countPublished() {
    return this.prisma.category.count({
      where: { articles: { some: { status: PUBLISHED } } },
    });
  }

  listPublished(skip: number, take: number) {
    return this.prisma.category.findMany({
      where: { articles: { some: { status: PUBLISHED } } },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      skip,
      take,
      include: { translations: true },
    });
  }

  findBySlugWithTranslations(slug: string, locale: string) {
    return this.prisma.categoryTranslation.findFirst({
      where: { slug, locale },
      include: { category: { include: { translations: true } } },
    });
  }

  countPublishedArticles(categoryId: string) {
    return this.prisma.article.count({ where: { categoryId, status: PUBLISHED } });
  }

  countAll() {
    return this.prisma.category.count();
  }

  listAll(skip: number, take: number) {
    return this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      skip,
      take,
      include: { translations: true },
    });
  }

  countAllArticles(categoryId: string) {
    return this.prisma.article.count({ where: { categoryId } });
  }

  findByIdWithTranslations(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });
  }

  findTranslationBySlug(locale: string, slug: string) {
    return this.prisma.categoryTranslation.findUnique({
      where: { locale_slug: { locale, slug } },
      select: { categoryId: true },
    });
  }

  createWithTranslations(input: {
    sort: number;
    createdById: string;
    translations: CategoryTranslationData[];
  }) {
    return this.prisma.category.create({
      data: {
        sort: input.sort,
        createdById: input.createdById,
        updatedById: input.createdById,
        translations: {
          create: input.translations.map((t) => ({
            locale: t.locale,
            slug: t.slug,
            label: t.label,
            description: t.description ?? null,
          })),
        },
      },
      include: { translations: true },
    });
  }

  updateCategory(id: string, input: { sort?: number; updatedById: string }) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
        updatedBy: { connect: { id: input.updatedById } },
      },
    });
  }

  upsertTranslation(categoryId: string, t: CategoryTranslationData) {
    return this.prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale: t.locale } },
      update: { slug: t.slug, label: t.label, description: t.description ?? null },
      create: { categoryId, locale: t.locale, slug: t.slug, label: t.label, description: t.description ?? null },
    });
  }

  deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
