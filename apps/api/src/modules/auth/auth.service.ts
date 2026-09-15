import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuditService } from '../history/audit.service';
import { hashPassword, verifyPassword } from './password';
import {
  hashToken,
  newRefreshToken,
  refreshTtlMs,
  signAccess,
  type AccessClaims,
} from './tokens';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string; role: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AuthRepository) private readonly auth: AuthRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async login(email: string, password: string): Promise<SessionTokens> {
    const user = await this.auth.findUserWithCredentialsByEmail(email);
    const hash = user?.credentials?.passwordHash;
    // Same failure shape whether the user or the password is wrong.
    if (!user || !hash || !(await verifyPassword(hash, password))) {
      // Best-effort security signal; must never break the 401 contract.
      try {
        await this.audit.record({ action: 'login.failed', entityType: 'user', entityId: user?.id ?? null });
      } catch (err) {
        this.logger.warn(`login.failed audit dropped: ${err instanceof Error ? err.message : err}`);
      }
      throw new UnauthorizedException('Invalid email or password.');
    }
    const session = await this.issue(user.id, user.email, user.displayName, user.role);
    try {
      await this.audit.record({ action: 'login', entityType: 'user', entityId: user.id, actorId: user.id });
    } catch (err) {
      this.logger.warn(`login audit dropped: ${err instanceof Error ? err.message : err}`);
    }
    return session;
  }

  async refresh(presented: string | undefined): Promise<SessionTokens> {
    if (!presented) throw new UnauthorizedException('Missing refresh token.');
    const row = await this.auth.findRefreshByHash(hashToken(presented));
    if (!row) throw new UnauthorizedException('Invalid refresh token.');
    if (row.revokedAt) {
      // Reuse detection: a revoked token presented again burns the family.
      await this.auth.revokeFamily(row.userId);
      throw new UnauthorizedException('Refresh token reuse detected.');
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired.');
    }
    const user = await this.auth.findUserById(row.userId);
    if (!user) throw new UnauthorizedException('Invalid refresh token.');
    await this.auth.revokeRefresh(row.id);
    return this.issue(user.id, user.email, user.displayName, user.role);
  }

  async logout(presented: string | undefined): Promise<void> {
    if (!presented) return;
    const row = await this.auth.findRefreshByHash(hashToken(presented));
    if (row && !row.revokedAt) await this.auth.revokeRefresh(row.id);
    if (row) {
      try {
        await this.audit.record({ action: 'logout', entityType: 'user', entityId: row.userId, actorId: row.userId });
      } catch (err) {
        this.logger.warn(`logout audit dropped: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  async me(userId: string) {
    const user = await this.auth.findUserById(userId);
    if (!user) throw new UnauthorizedException('Invalid session.');
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
  }

  async hashForSeed(password: string): Promise<string> {
    return hashPassword(password);
  }

  private async issue(id: string, email: string, displayName: string, role: string): Promise<SessionTokens> {
    const refreshToken = newRefreshToken();
    await this.auth.createRefreshToken(
      id,
      hashToken(refreshToken),
      new Date(Date.now() + refreshTtlMs()),
    );
    const claims: AccessClaims = { sub: id, email, role };
    return { accessToken: signAccess(claims), refreshToken, user: { id, email, displayName, role } };
  }
}
