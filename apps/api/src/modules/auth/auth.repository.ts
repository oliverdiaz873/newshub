import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Thin repository for identity + credential + refresh-token persistence.
 * Secrets are never returned: callers select explicit safe projections.
 */
@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findUserWithCredentialsByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { credentials: true },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findRefreshByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeRefresh(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  revokeFamily(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
