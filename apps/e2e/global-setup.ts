import { execSync } from 'node:child_process';
import path from 'node:path';

const API_DIR = path.resolve(__dirname, '../api');
const E2E_DB =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/newshub_e2e';
// Exact database name the destructive seed may run against. Overridable
// for exotic setups, but it must always be the E2E database — never dev,
// test, or production. A bare `NODE_ENV !== 'production'` check is not
// enough: it would still allow wiping newshub_dev.
const EXPECTED_E2E_DB = process.env.E2E_EXPECTED_DB ?? 'newshub_e2e';

function redactTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

/**
 * Fail-safe gate before any destructive operation (migrate deploy +
 * truncate-and-reload seed). Verifies the URL exists, parses, uses the
 * postgres protocol, and names EXACTLY the expected E2E database.
 */
function assertE2eDatabase(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error(
      'E2E setup refused: E2E_DATABASE_URL is unset. ' +
        `Set it to the E2E database (${EXPECTED_E2E_DB}).`,
    );
  }
  let name: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'postgres:' && u.protocol !== 'postgresql:') {
      throw new Error(`unexpected protocol ${u.protocol}`);
    }
    name = u.pathname.replace(/^\/+/, '').split('?')[0];
  } catch {
    throw new Error(
      `E2E setup refused: E2E_DATABASE_URL does not parse (${redactTarget(url)}). ` +
        `Set it to the E2E database (${EXPECTED_E2E_DB}).`,
    );
  }
  if (name !== EXPECTED_E2E_DB) {
    throw new Error(
      `E2E setup refused: database '${name}' is not the E2E database ` +
        `('${EXPECTED_E2E_DB}', at ${redactTarget(url)}). Refusing to run ` +
        'destructive migrate/seed against a non-E2E database.',
    );
  }
}

/**
 * Deterministic seed per run: migrate + truncate-and-reload the editorial
 * fixtures. Each test additionally uses fixed slugs and cleans up what it
 * creates, so tests never depend on each other's leftovers.
 *
 * Prerequisite (once): createdb newshub_e2e  (see README).
 */
async function globalSetup() {
  assertE2eDatabase(E2E_DB);
  // Sensitive: must come from the environment (same value as
  // playwright.config.ts boots the API with). No fallback in code.
  const jwt = process.env.E2E_JWT_SECRET;
  if (!jwt) {
    throw new Error(
      'E2E setup refused: E2E_JWT_SECRET is unset. ' +
        'Set it to the JWT secret the E2E API should boot with.',
    );
  }
  const env = {
    ...process.env,
    DATABASE_URL: E2E_DB,
    TEST_DATABASE_URL: E2E_DB,
    JWT_SECRET: jwt,
  };
  execSync('npx prisma migrate deploy', { cwd: API_DIR, env, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { cwd: API_DIR, env, stdio: 'pipe' });
}

export default globalSetup;
