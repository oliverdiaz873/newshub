import { defineConfig } from '@playwright/test';
import path from 'node:path';

const API_DIR = path.resolve(__dirname, '../api');
const DASHBOARD_DIR = path.resolve(__dirname, '../dashboard');
const STOREFRONT_DIR = path.resolve(__dirname, '../storefront');
// Overridable for CI (which sets a password); local default uses trust auth.
const E2E_DB =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/newshub_e2e';

/**
 * Browser E2E (P0-3): dashboard + storefront + API against an isolated
 * newshub_e2e database. workers:1, retries:2 on CI only. No Docker anywhere:
 * PostgreSQL is expected running locally (see README prerequisites).
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3212',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Cold boots (empty .next after pretest clean) can take minutes locally.
  webServer: [
    {
      command: 'npm run dev',
      cwd: API_DIR,
      url: 'http://localhost:3211/api/v1/health',
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        DATABASE_URL: E2E_DB,
        TEST_DATABASE_URL: E2E_DB,
        JWT_SECRET: 'e2e-test-secret',
        PORT: '3211',
        DASHBOARD_URL: 'http://localhost:3212',
        STOREFRONT_URL: 'http://localhost:3210',
        API_PUBLIC_URL: 'http://localhost:3211',
      },
    },
    {
      command: 'npm run dev -- --port 3212',
      cwd: DASHBOARD_DIR,
      url: 'http://localhost:3212/login',
      reuseExistingServer: false,
      timeout: 300_000,
      env: { NEXT_PUBLIC_API_URL: 'http://localhost:3211/api/v1' },
    },
    {
      command: 'npm run dev -- --port 3210',
      cwd: STOREFRONT_DIR,
      url: 'http://localhost:3210/es',
      reuseExistingServer: false,
      timeout: 300_000,
      env: { NEXT_PUBLIC_API_URL: 'http://localhost:3211/api/v1' },
    },
  ],
});
