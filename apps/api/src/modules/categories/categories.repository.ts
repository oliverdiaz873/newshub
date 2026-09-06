import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLISHED = 'published';

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
}
