import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Minimal media access for cover validation (upload/selection UI is F5). */
@Injectable()
export class MediaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } });
  }

  findFullById(id: string) {
    return this.prisma.mediaAsset.findUnique({ where: { id } });
  }

  list(skip: number, take: number) {
    return this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countAll() {
    return this.prisma.mediaAsset.count();
  }

  create(input: {
    storageKey: string;
    mime: string;
    width: number | null;
    height: number | null;
    createdById: string;
  }) {
    return this.prisma.mediaAsset.create({ data: input });
  }

  deleteById(id: string) {
    return this.prisma.mediaAsset.delete({ where: { id } });
  }

  /** Any article/opinion cover reference blocks deletion (any status). */
  countReferences(id: string) {
    return this.prisma.$transaction([
      this.prisma.article.count({ where: { coverMediaId: id } }),
      this.prisma.opinion.count({ where: { coverMediaId: id } }),
    ]).then(([articles, opinions]) => articles + opinions);
  }
}
