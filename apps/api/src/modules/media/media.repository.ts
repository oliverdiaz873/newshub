import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /**
   * Server-side search (PR2B): `q` matches originalFilename OR mime
   * (case-insensitive contains). NULL filenames simply never match the
   * filename branch; storageKey is deliberately never searched.
   */
  private searchWhere(q?: string) {
    if (!q) return {};
    return {
      OR: [
        { originalFilename: { contains: q, mode: 'insensitive' as const } },
        { mime: { contains: q, mode: 'insensitive' as const } },
      ],
    };
  }

  list(skip: number, take: number, q?: string) {
    return this.prisma.mediaAsset.findMany({
      where: this.searchWhere(q),
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  countAll(q?: string) {
    return this.prisma.mediaAsset.count({ where: this.searchWhere(q) });
  }

  create(input: {
    storageKey: string;
    mime: string;
    width: number | null;
    height: number | null;
    originalFilename: string | null;
    bytes: number | null;
    createdById: string;
  }, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).mediaAsset.create({ data: input });
  }

  deleteById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).mediaAsset.delete({ where: { id } });
  }

  /** Any article/opinion cover reference blocks deletion (any status). */
  countReferences(id: string) {
    return this.prisma.$transaction([
      this.prisma.article.count({ where: { coverMediaId: id } }),
      this.prisma.opinion.count({ where: { coverMediaId: id } }),
    ]).then(([articles, opinions]) => articles + opinions);
  }
}
