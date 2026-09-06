import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Thin repository: owns persistence details, no domain logic.
 * Authors have no public controller in v1 (embedded only).
 */
@Injectable()
export class AuthorsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findByIdWithLocale(id: string, locale: string) {
    return this.prisma.author.findUnique({
      where: { id },
      include: { translations: { where: { locale } } },
    });
  }

  findByIdFull(id: string) {
    return this.prisma.author.findUnique({
      where: { id },
      include: { translations: true },
    });
  }

  listAll() {
    return this.prisma.author.findMany({
      orderBy: { createdAt: 'asc' },
      include: { translations: true },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.author.findUnique({ where: { slug }, select: { id: true } });
  }

  createWithTranslations(slug: string, translations: Array<{ locale: string; name: string; bio?: string | null }>) {
    return this.prisma.author.create({
      data: {
        slug,
        translations: {
          create: translations.map((t) => ({ locale: t.locale, name: t.name, bio: t.bio ?? null })),
        },
      },
      include: { translations: true },
    });
  }

  updateSlug(id: string, slug: string) {
    return this.prisma.author.update({ where: { id }, data: { slug } });
  }

  upsertTranslation(authorId: string, t: { locale: string; name: string; bio?: string | null }) {
    return this.prisma.authorTranslation.upsert({
      where: { authorId_locale: { authorId, locale: t.locale } },
      update: { name: t.name, bio: t.bio ?? null },
      create: { authorId, locale: t.locale, name: t.name, bio: t.bio ?? null },
    });
  }

  deleteAuthor(id: string) {
    return this.prisma.author.delete({ where: { id } });
  }

  countOpinions(authorId: string) {
    return this.prisma.opinion.count({ where: { authorId } });
  }
}
