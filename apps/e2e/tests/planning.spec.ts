import { expect, test, type Page } from '@playwright/test';
import { EDITOR, REVIEWER, switchApiSession, useApiSession } from '../fixtures/auth';

const RUN = Date.now().toString(36);
const API = 'http://localhost:3211/api/v1';

/** Starts the page as the given role without hitting the login UI. */
async function loginAsRole(page: Page, role: { email: string; password: string }) {
  await useApiSession(page, role);
  await page.goto('/');
}

async function gotoPlanning(page: Page) {
  await page.getByRole('link', { name: 'Planificación' }).click();
  await expect(page).toHaveURL('http://localhost:3212/planning');
}

/** Authenticated API helpers using the dashboard session token. */
async function apiToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.sessionStorage.getItem('nh_access'));
  expect(token).toBeTruthy();
  return token as string;
}

async function apiMe(page: Page, token: string): Promise<string> {
  const res = await page.request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function apiCreateAssignment(page: Page, token: string, title: string, assigneeId: string, dueAt: string): Promise<string> {
  const res = await page.request.post(`${API}/planning`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { type: 'assignment', title, assigneeId, dueAt },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as { id: string };
  return body.id;
}

async function apiTransition(page: Page, token: string, id: string, action: string, expected = 200) {
  const res = await page.request.post(`${API}/planning/${id}/${action}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(expected);
}

function rowByTitle(page: Page, title: string) {
  return page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
}

test('editor creates a pitch through the form', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  await gotoPlanning(page);
  await page.getByRole('button', { name: 'Nuevo elemento' }).click();
  await page.getByLabel('Título', { exact: true }).fill(`E2E Pitch largo ${RUN}`);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Elemento creado.').first()).toBeVisible();
  await page.locator('#planning-q').fill(RUN);
  await expect(rowByTitle(page, `E2E Pitch largo ${RUN}`).getByRole('cell', { name: 'Propuesto' })).toBeVisible();
});

test('assignment runs the full cycle from the list', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  const token = await apiToken(page);
  const me = await apiMe(page, token);
  const title = `E2E Assign largo ${RUN}`;
  const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString();
  await apiCreateAssignment(page, token, title, me, tomorrow);

  await gotoPlanning(page);
  await page.locator('#planning-q').fill(RUN);
  const row = rowByTitle(page, title);
  await expect(row.getByRole('cell', { name: 'Asignado' })).toBeVisible();
  await row.getByRole('button', { name: 'Iniciar' }).click();
  await expect(row.getByRole('cell', { name: 'En curso' })).toBeVisible();
  await row.getByRole('button', { name: 'Enviar' }).click();
  await expect(row.getByRole('cell', { name: 'En revisión' })).toBeVisible();
  await row.getByRole('button', { name: 'Completar' }).click();
  await expect(row.getByRole('cell', { name: 'Terminado' })).toBeVisible();
});

test('reviewer sees the queue and completes in-review work', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  const token = await apiToken(page);
  const me = await apiMe(page, token);
  const title = `E2E Review largo ${RUN}`;
  const id = await apiCreateAssignment(page, token, title, me, new Date(Date.now() + 48 * 3600_000).toISOString());
  await apiTransition(page, token, id, 'start');
  await apiTransition(page, token, id, 'submit');
  await switchApiSession(page, REVIEWER);
  // Unified review queue on the overview shows planning work still in review.
  await expect(page.getByText(title).first()).toBeVisible();

  await gotoPlanning(page);
  await expect(page.getByRole('link', { name: 'Nuevo elemento' })).toHaveCount(0);
  await page.locator('#planning-q').fill(RUN);
  const row = rowByTitle(page, title);
  await expect(row.getByRole('cell', { name: 'En revisión' })).toBeVisible();
  await row.getByRole('button', { name: 'Completar' }).click();
  await expect(page.getByText('Elemento actualizado.').first()).toBeVisible();
});

test('calendar shows due items and navigates months', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  const token = await apiToken(page);
  const me = await apiMe(page, token);
  const title = `E2E Cal largo ${RUN}`;
  await apiCreateAssignment(page, token, title, me, new Date(Date.now() + 24 * 3600_000).toISOString());

  await gotoPlanning(page);
  await page.getByRole('button', { name: 'Calendario' }).click();
  const calendar = page.getByRole('region', { name: 'Calendario' });
  await expect(calendar.getByRole('list')).toBeVisible();
  await expect(page.getByText(title).first()).toBeVisible();
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await page.getByRole('button', { name: 'Hoy' }).click();
  await expect(calendar.getByRole('list')).toBeVisible();
});
