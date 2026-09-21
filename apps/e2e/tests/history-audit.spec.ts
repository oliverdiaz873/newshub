import { expect, test } from '@playwright/test';
import { fetchApiToken, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
// Unique per run: history, diff and audit rows belong to this test only.
const RUN = Date.now().toString(36);

/**
 * Editorial traceability (history + audit) for an owned article.
 * API prepares the three versions (create -> review -> publish) and removes
 * the article afterwards; the UI proves versions, diff, the audit deep-link
 * and the event detail modal. Restore is deliberately not exercised.
 */
test('article history shows versions, diff and audit trail', async ({ page }) => {
  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
  const slug = `e2e-hist-${RUN}`;
  const title = `E2E Historial titulo largo ${RUN}`;
  const created = (await (
    await fetch(`${API}/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        categoryId: cats.data[0].id,
        translations: [
          {
            locale: 'es',
            slug,
            title,
            summary: 'Resumen suficientemente largo para la validacion.',
            content: ['Cuerpo para historial.'],
          },
        ],
      }),
    })
  ).json()) as { id: string };
  const id = created.id;

  const reviewRes = await fetch(`${API}/articles/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'review' }),
  });
  if (!reviewRes.ok) throw new Error(`submit-for-review failed: ${reviewRes.status}`);
  const publishRes = await fetch(`${API}/articles/${id}/publish`, { method: 'POST', headers });
  if (!publishRes.ok) throw new Error(`publish failed: ${publishRes.status}`);

  await useApiSession(page);
  await page.goto(`${DASHBOARD}/articles/${id}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Historial' }).click();
  // Three versions: create, review transition, publish transition.
  await expect(page.getByRole('button', { name: 'Restaurar esta versión' })).toHaveCount(3, {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Comparar con anterior' }).first().click();
  await expect(page.getByRole('heading', { name: /Cambios desde/ })).toBeVisible();
  await expect(page.getByText('published').first()).toBeVisible();

  await page.getByRole('link', { name: 'Ver en auditoría' }).first().click();
  await expect(page).toHaveURL(new RegExp(`/audit-log\\?entityType=article&entityId=${id}`));
  await expect(page.getByRole('cell', { name: 'publish' }).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Detalle' }).first().click();
  await expect(page.getByRole('heading', { name: 'Detalle del evento' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/afterStatus.*published/)).toBeVisible();

  const unpub = await fetch(`${API}/articles/${id}/unpublish`, { method: 'POST', headers });
  if (!unpub.ok) throw new Error(`cleanup unpublish failed: ${unpub.status}`);
  const del = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers });
  if (!del.ok) throw new Error(`cleanup delete failed: ${del.status}`);
});
