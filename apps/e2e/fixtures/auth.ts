import { expect, type Page } from '@playwright/test';

export const EDITOR = { email: 'editor@newshub.local', password: 'Editor123!' };
const API_BASE = 'http://localhost:3211/api/v1';

let cachedToken: string | null = null;

async function apiLoginOnce(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(EDITOR),
  });
  if (!res.ok) throw new Error(`API login failed: ${res.status}`);
  const body = (await res.json()) as { accessToken: string };
  cachedToken = body.accessToken;
  return cachedToken;
}

/**
 * Authenticates the page WITHOUT going through the login UI (single API
 * login per run, cached). The UI login flow itself is covered by auth.spec.
 * This keeps the suite far below the login rate limit and is also faster.
 * Must be called before the first navigation of the test.
 */
export async function useApiSession(page: Page) {
  const token = await apiLoginOnce();
  await page.addInitScript((value) => {
    window.sessionStorage.setItem('nh_access', value);
  }, token);
}

export async function loginAs(page: Page, email = EDITOR.email, password = EDITOR.password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Acceder' }).click();
  await expect(page).toHaveURL(/\/categories/);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login/);
}
