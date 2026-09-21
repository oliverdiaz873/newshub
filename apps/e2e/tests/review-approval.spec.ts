import { expect, test, type Page } from '@playwright/test';
import { EDITOR, REVIEWER, fetchApiToken, switchApiSession, useApiSession } from '../fixtures/auth';

const RUN = Date.now().toString(36);
const API = 'http://localhost:3211/api/v1';

async function apiHeaders(): Promise<Record<string, string>> {
  const token = await fetchApiToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** Isolation: removes the article created by the test (unpublishing first when needed). */
async function cleanupArticle(id: string, published: boolean) {
  const headers = await apiHeaders();
  if (published) {
    const unpub = await fetch(`${API}/articles/${id}/unpublish`, { method: 'POST', headers });
    if (!unpub.ok) throw new Error(`cleanup unpublish failed: ${unpub.status}`);
  }
  const del = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers });
  if (!del.ok) throw new Error(`cleanup delete failed: ${del.status}`);
}

function articleIdFromUrl(url: string): string {
  const id = url.split('/').pop() ?? '';
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  return id;
}

/**
 * Starts the page as the given role without hitting the login UI
 * (login rate limit is 10/min; UI login itself is covered by auth.spec).
 * Lands on `/` (the login default). Callers use in-app navigation
 * afterwards so the client session is preserved (no full-page reloads).
 */
async function loginAsRole(page: Page, role: { email: string; password: string }) {
  await useApiSession(page, role);
  await page.goto('/');
}

async function filterReviewQueue(page: Page) {
  await page.getByLabel('Estado').first().selectOption('review');
  await page.locator('#articles-q').fill(RUN);
}

async function createDraftViaNew(page: Page, slug: string, title: string) {
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(slug);
  await page.getByLabel('Título', { exact: true }).first().fill(title);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Cuerpo de revision.');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Exclude /articles/new itself: a loose /articles/.+/ pattern also matches
  // the form while creation is still in flight (see articles.spec.ts).
  await expect(page).toHaveURL(/\/articles\/(?!new)[^/]+/, { timeout: 30_000 });
}

test('editor submits review, reviewer approves, content becomes published', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  const slug = `e2e-rev-${RUN}`;
  const title = `E2E Revision titulo largo ${RUN}`;
  await createDraftViaNew(page, slug, title);
  const articleId = articleIdFromUrl(page.url());

  // Draft direct-publish is gone from the UI (two-step approval).
  await expect(page.getByRole('button', { name: 'Publicar' })).toHaveCount(0);

  // Submit for review from the detail editor.
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByText('Artículo guardado.')).toBeVisible();

  // Reviewer approves.
  await switchApiSession(page, REVIEWER);
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await filterReviewQueue(page);
  const reviewRow = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
  await expect(reviewRow.getByRole('cell', { name: 'review' })).toBeVisible();
  await reviewRow.getByRole('button', { name: 'Publicar' }).click();
  // Approving leaves the review filter set, so reset it before asserting.
  await page.getByLabel('Estado').first().selectOption('all');
  const publishedRow = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
  await expect(publishedRow.getByRole('cell', { name: 'published' })).toBeVisible();

  await cleanupArticle(articleId, true);
});

test('reviewer rejects with reason, content returns to draft', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  const slug = `e2e-rej-${RUN}`;
  const title = `E2E Rechazo titulo largo ${RUN}`;
  await createDraftViaNew(page, slug, title);
  const articleId = articleIdFromUrl(page.url());
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(page.getByText('Artículo guardado.')).toBeVisible();

  await switchApiSession(page, REVIEWER);
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await filterReviewQueue(page);
  const reviewRow = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
  const editLink = reviewRow.getByRole('link', { name: 'Editar' });
  await expect(editLink).toBeVisible();
  await editLink.click();
  try {
    await expect(page).toHaveURL(/\/articles\/.+/, { timeout: 5000 });
  } catch {
    // List re-renders (debounced filter sync) can swallow a click; retry once.
    await editLink.click();
    await expect(page).toHaveURL(/\/articles\/.+/);
  }
  await page.getByRole('button', { name: 'Rechazar' }).click();
  await page.getByLabel('Motivo').fill('Actualiza la fuente por favor.');
  await page.getByRole('dialog').getByRole('button', { name: 'Rechazar' }).click();
  await expect(page.getByText('Artículo devuelto a borrador.')).toBeVisible();

  await page.getByRole('link', { name: 'Notificaciones' }).click();
  await expect(page).toHaveURL('http://localhost:3212/notifications');
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();

  await cleanupArticle(articleId, false);
});

test('notification preferences toggle persists via API', async ({ page }) => {
  await loginAsRole(page, REVIEWER);
  await page.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page).toHaveURL('http://localhost:3212/settings');
  const box = page.getByRole('checkbox', { name: 'Publicado', exact: true });
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(page.getByText('Preferencias guardadas.').first()).toBeVisible();
  await expect(box).not.toBeChecked();
  await expect(page.getByText('Preferencias guardadas.')).toBeHidden({ timeout: 10000 });
  await box.check();
  await expect(page.getByText('Preferencias guardadas.').first()).toBeVisible();
  await expect(box).toBeChecked();
});

test('reviewer cannot create content, inbox supports read-all', async ({ page }) => {
  await loginAsRole(page, REVIEWER);
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await expect(page.getByRole('link', { name: 'Nuevo artículo' })).toHaveCount(0);

  const markAll = page.getByRole('button', { name: 'Marcar todas como leídas' });
  await page.getByRole('link', { name: 'Notificaciones' }).click();
  await expect(page).toHaveURL('http://localhost:3212/notifications');
  if (await markAll.isEnabled()) {
    await markAll.click();
    await expect(page.getByText('Todas las notificaciones marcadas como leídas.')).toBeVisible();
  }
});
