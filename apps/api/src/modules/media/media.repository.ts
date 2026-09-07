import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Minimal media access for cover validation (upload/selection UI is F5). */
@Injectable()
export class MediaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } });
  }
}
