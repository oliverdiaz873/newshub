/**
 * M9 seed guard: the Prisma seed TRUNCATEs every editorial table, so it
 * must never run against production by accident. Pure function (unit
 * tested); the seed script calls it before any database operation.
 */
export function assertSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production' && env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error(
      'Refusing to run the destructive seed with NODE_ENV=production. ' +
        'Set ALLOW_DESTRUCTIVE_SEED=true explicitly to proceed.',
    );
  }
}

/** Redacted `protocol//host:port/db` summary for logs (never credentials). */
export function describeSeedTarget(databaseUrl: string | undefined): string {
  if (!databaseUrl) return '(DATABASE_URL unset)';
  try {
    const u = new URL(databaseUrl);
    return `${u.protocol}//${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}
