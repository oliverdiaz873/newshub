import { execSync } from 'node:child_process';
import path from 'node:path';

const API_DIR = path.resolve(__dirname, '../api');
const E2E_DB =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/newshub_e2e';

/**
 * Deterministic seed per run: migrate + truncate-and-reload the editorial
 * fixtures. Each test additionally uses fixed slugs and cleans up what it
 * creates, so tests never depend on each other's leftovers.
 *
 * Prerequisite (once): createdb newshub_e2e  (see README).
 */
async function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: E2E_DB,
    TEST_DATABASE_URL: E2E_DB,
    JWT_SECRET: 'e2e-test-secret',
  };
  execSync('npx prisma migrate deploy', { cwd: API_DIR, env, stdio: 'pipe' });
  execSync('npx tsx prisma/seed.ts', { cwd: API_DIR, env, stdio: 'pipe' });
}

export default globalSetup;
