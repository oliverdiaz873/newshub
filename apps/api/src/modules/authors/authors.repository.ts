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
}
