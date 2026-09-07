import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface AccessClaims {
  sub: string;
  email: string;
  role: string;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[auth] JWT_SECRET is required in production. Refusing to boot with a known fallback secret.',
    );
  }
  // Dev/test fallback; production must set JWT_SECRET (documented in .env.example).
  console.warn('[auth] JWT_SECRET unset, using insecure dev fallback.');
  return 'dev-secret-change-me';
}

/** Provisional defaults; exact TTLs stay open per ADR-010 (env-overridable). */
export function accessTtlSeconds(): number {
  return Number(process.env.JWT_ACCESS_TTL_MIN ?? 15) * 60;
}

export function refreshTtlMs(): number {
  return Number(process.env.REFRESH_TTL_DAYS ?? 7) * 24 * 60 * 60 * 1000;
}

export function signAccess(claims: AccessClaims): string {
  return jwt.sign(claims, secret(), { expiresIn: accessTtlSeconds() });
}

export function verifyAccess(token: string): AccessClaims {
  return jwt.verify(token, secret()) as AccessClaims;
}

/** Opaque random refresh token (never a JWT); only its hash is persisted. */
export function newRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
