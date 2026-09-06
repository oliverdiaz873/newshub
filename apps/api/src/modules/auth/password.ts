import * as argon2 from 'argon2';

/**
 * Password hashing (ADR-010): Argon2id first option. Verified working with
 * prebuilt binaries in this environment (no native toolchain needed).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
