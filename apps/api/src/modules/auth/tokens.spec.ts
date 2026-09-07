import { hashToken, newRefreshToken, signAccess, verifyAccess } from './tokens';

const CLAIMS = { sub: 'u1', email: 'a@newshub.local', role: 'editor' };

describe('auth secrets (P0-1)', () => {
  const env = { ...process.env };

  afterEach(() => {
    for (const key of ['JWT_SECRET', 'NODE_ENV'] as const) {
      const original = env[key];
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  });

  it('uses the dev fallback outside production', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const token = signAccess(CLAIMS);
    expect(verifyAccess(token)).toMatchObject(CLAIMS);
  });

  it('uses an explicit secret when set, in any environment', () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    process.env.NODE_ENV = 'production';
    const token = signAccess(CLAIMS);
    expect(verifyAccess(token)).toMatchObject(CLAIMS);
  });

  it('refuses to boot token operations in production without a secret', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => signAccess(CLAIMS)).toThrow(/JWT_SECRET is required in production/);
    expect(() => verifyAccess('whatever')).toThrow(/JWT_SECRET is required in production/);
  });

  it('keeps refresh tokens opaque (never JWTs)', () => {
    const raw = newRefreshToken();
    expect(raw).toMatch(/^[0-9a-f]{96}$/);
    expect(hashToken(raw)).toHaveLength(64);
  });
});
