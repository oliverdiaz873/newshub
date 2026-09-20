import { expect, test } from '@playwright/test';
import { fetchApiToken, useApiSession } from '../fixtures/auth';

// Unique per run (see articles.spec.ts): fixed titles risk strict-mode
// collisions in list cells, whose accessible name appends the slug.
const RUN = Date.now().toString(36);
const TITLE = `E2E Portada ${RUN} titulo largo`;

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const API = 'http://localhost:3211/api/v1';

async function apiToken(): Promise<string> {
  return fetchApiToken();
}

/** Newest-first media id right after our upload (only uploader in the run). */
async function newestMediaId(token: string): Promise<string> {
  const res = await fetch(`${API}/media?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API media list failed: ${res.status}`);
  const body = (await res.json()) as { data: Array<{ id: string }> };
  if (body.data.length === 0) throw new Error('API media list is empty after upload');
  return body.data[0].id;
}

test('media upload, cover assignment and protected delete', async ({ page }) => {
  await useApiSession(page);
  const token = await apiToken();
  await page.goto('/media');
  // The upload control is #media-file (label 'Archivo') since the
  // MediaManager migration; the former #file input is gone.
  await page.locator('#media-file').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Subir' }).click();
  await expect(page.getByText('Imagen subida.')).toBeVisible();
  // Cards show no filename, so target ours by id (newest-first list).
  const mediaId = await newestMediaId(token);
  await page.locator('#media-q').fill(mediaId);
  await expect(page.locator('.nh-media-card')).toHaveCount(1);

  // Article creation lives on /articles/new; cover is assigned through
  // the shared MediaPicker grid (the 'Portada (opcional)' select is gone).
  await page.goto('/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(`e2e-cover-${RUN}`);
  await page.getByLabel('Título', { exact: true }).first().fill(TITLE);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Cuerpo con portada.');
  await page.locator('#media-picker-q').fill(mediaId);
  await page.locator('.nh-media-cell').first().click();
  await expect(page.locator('.nh-media-cell.selected')).toHaveCount(1);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Exclude /articles/new itself (see articles.spec.ts). 30s: cold-route
  // Turbopack compile on dev (see opinions.spec.ts).
  await expect(page).toHaveURL(/\/articles\/(?!new)[^/]+/, { timeout: 30_000 });
  await page.goto('/articles');
  await page.locator('#articles-q').fill(TITLE);
  await expect(page.getByRole('row', { name: new RegExp(TITLE) })).toBeVisible();

  await page.goto('/media');
  await page.locator('#media-q').fill(mediaId);
  const row = page.locator('.nh-media-card').first();
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  // The guard message grew reassignment guidance; assert current text.
  // It surfaces as a toast (3.3s), caught by auto-retry polling.
  await expect(
    page.getByText('No se puede eliminar: está asignada como portada. Desvincúlala del contenido primero.'),
  ).toBeVisible();
  // Blocked: the card is still there.
  await expect(page.locator('.nh-media-card')).toHaveCount(1);

  await page.goto('/articles');
  await page.locator('#articles-q').fill(TITLE);
  const article = page.getByRole('row', { name: new RegExp(TITLE) });
  await article.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('row', { name: new RegExp(TITLE) })).toHaveCount(0);

  await page.goto('/media');
  await page.locator('#media-q').fill(mediaId);
  const freed = page.locator('.nh-media-card').first();
  await freed.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Imagen eliminada.')).toBeVisible();
  await expect(page.locator('.nh-media-card')).toHaveCount(0);
});
