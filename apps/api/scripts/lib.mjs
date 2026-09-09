/**
 * Shared helpers for the P0-4 backup/restore scripts.
 * stdlib only (portable Windows/Linux), no npm dependencies.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Domain tables covered by the drill verification (excludes _prisma_migrations). */
export const TABLES = [
  'users',
  'authors',
  'author_translations',
  'categories',
  'category_translations',
  'articles',
  'article_translations',
  'opinions',
  'opinion_translations',
  'media_assets',
  'user_credentials',
  'refresh_tokens',
];

export function pgBin(name) {
  const dir = (process.env.PG_BIN_DIR ?? '').trim().replace(/[\\/]+$/, '');
  const candidates = dir ? [`${dir}/${name}`, name] : [name];
  const lastError = [];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['--version'], { stdio: 'pipe' });
      return bin;
    } catch (err) {
      lastError.push(String(err?.message ?? err).split('\n')[0]);
    }
  }
  throw new Error(
    `PostgreSQL binary '${name}' not found. Install postgresql-client or set PG_BIN_DIR. Tried: ${candidates.join(', ')}. ${lastError.join(' | ')}`,
  );
}

export function run(bin, args, { env } = {}) {
  execFileSync(bin, args, { stdio: 'inherit', env: { ...process.env, ...env } });
}

export function capture(bin, args, { env } = {}) {
  return execFileSync(bin, args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
}

export function dbName(databaseUrl) {
  const u = new URL(databaseUrl);
  const name = u.pathname.replace(/^\//, '');
  if (!name) throw new Error(`Cannot parse database name from URL (password redacted).`);
  return name;
}

/** Redacted one-line summary for logs (never prints credentials). */
export function describeDb(databaseUrl) {
  const u = new URL(databaseUrl);
  return `${u.protocol}//${u.hostname}:${u.port || 5432}/${dbName(databaseUrl)}`;
}

export function tableCounts(databaseUrl, psql) {
  const counts = {};
  for (const table of TABLES) {
    const out = capture(psql, [
      '--dbname',
      databaseUrl,
      '--tuples-only',
      '--no-align',
      '--command',
      `SELECT count(*) FROM "${table}"`,
    ]);
    const n = Number.parseInt(out, 10);
    if (!Number.isInteger(n)) throw new Error(`Unexpected count for "${table}": ${JSON.stringify(out)}`);
    counts[table] = n;
  }
  return counts;
}

export function databaseExists(databaseUrl, psql) {
  const name = dbName(databaseUrl);
  const base = new URL(databaseUrl);
  base.pathname = '/postgres';
  const out = capture(psql, [
    '--dbname',
    base.toString(),
    '--tuples-only',
    '--no-align',
    '--command',
    `SELECT 1 FROM pg_database WHERE datname = '${name.replace(/'/g, "''")}'`,
  ]);
  return out === '1';
}

export function getArg(args, name, def) {
  const prefix = `--${name}=`;
  for (const a of args) if (a.startsWith(prefix)) return a.slice(prefix.length);
  return def;
}

export function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

export function requireEnv(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`Environment variable ${name} is required.`);
  return value;
}

export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
