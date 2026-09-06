import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
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
  constructor(@Inject(AuthRepository) private readonly auth: AuthRepository) {}

  async login(email: string, password: string): Promise<SessionTokens> {
    const user = await this.auth.findUserWithCredentialsByEmail(email);
    const hash = user?.credentials?.passwordHash;
    // Same failure shape whether the user or the password is wrong.
    if (!user || !hash || !(await verifyPassword(hash, password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.issue(user.id, user.email, user.displayName, user.role);
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
