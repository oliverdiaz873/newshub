import { expect, type Page } from '@playwright/test';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `E2E setup refused: ${name} is unset. ` +
        'Copy apps/e2e/.env.example to a local gitignored .env.e2e (or export the vars) ' +
        'with values matching the E2E seed. See apps/e2e/README.md.',
    );
  }
  return value;
}

// Test identities. Emails are non-sensitive identifiers (local fallback kept);
// passwords are sensitive and MUST come from the environment (no fallback in
// code). Values must match the users created by the E2E seed
// (apps/api/prisma/seed.ts, dev-only credentials).
export const EDITOR = {
  email: process.env.E2E_EDITOR_EMAIL ?? 'editor@newshub.local',
  get password(): string {
    return required('E2E_EDITOR_PASSWORD');
  },
};
export const REVIEWER = {
  email: process.env.E2E_REVIEWER_EMAIL ?? 'reviewer@newshub.local',
  get password(): string {
    return required('E2E_REVIEWER_PASSWORD');
  },
};
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@newshub.local',
  get password(): string {
    return required('E2E_ADMIN_PASSWORD');
  },
};
const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3211/api/v1';

const cachedTokens = new Map<string, string>();

async function apiLoginAs(role: { email: string; password: string }): Promise<string> {
  const hit = cachedTokens.get(role.email);
  if (hit) return hit;
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error(`API login failed: ${res.status}`);
  const body = (await res.json()) as { accessToken: string };
  cachedTokens.set(role.email, body.accessToken);
  return body.accessToken;
}

/**
 * Direct API login for test setup/teardown (not a UI flow). Shares the
 * single EDITOR identity above so passwords live in one place.
 */
export async function fetchApiToken(): Promise<string> {
  return apiLoginAs(EDITOR);
}

/**
 * Authenticates the page WITHOUT going through the login UI (one API
 * login per role per run, cached). The UI login flow itself is covered by
 * auth.spec. This keeps the suite far below the login rate limit
 * (10/min, see apps/api auth.controller) and is also faster.
 * Must be called before the first navigation of the test.
 */
export async function useApiSession(page: Page, role: { email: string; password: string } = EDITOR) {
  const token = await apiLoginAs(role);
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('nh_access', value);
  }, token);
}

/**
 * Switches the already-open page to another role WITHOUT going through
 * the login UI. Re-registers the session init script (init scripts run in
 * registration order on every load, so the newest one wins over the
 * previous role's script from useApiSession) and reloads so the app
 * rehydrates as the new role. Same rate-limit rationale as useApiSession.
 */
export async function switchApiSession(
  page: Page,
  role: { email: string; password: string },
) {
  const token = await apiLoginAs(role);
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('nh_access', value);
  }, token);
  await page.reload();
}

export async function loginAs(page: Page, email = EDITOR.email, password = EDITOR.password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Acceder' }).click();
  // Login lands on the overview (/) since the dashboard home migration;
  // category listing moved to /categories as a section, not the landing.
  await expect(page).toHaveURL('http://localhost:3212/');
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login/);
}
