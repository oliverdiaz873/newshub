import { expect, test } from '@playwright/test';
import { fetchApiToken, REVIEWER, useApiSession } from '../fixtures/auth';

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

/**
 * D4: reviewers read History (versions + diff) but the Restore action is
 * not rendered for them. Absence is asserted in the DOM (count 0), not
 * via `disabled`.
 */
test('reviewer reads history without restore action', async ({ page }) => {
  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
  const slug = `e2e-hist-rev-${RUN}`;
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
            title: `E2E Historial reviewer largo ${RUN}`,
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

  await useApiSession(page, REVIEWER);
  await page.goto(`${DASHBOARD}/articles/${id}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Historial' }).click();
  // Two versions are listed (create + review transition).
  await expect(page.getByText(/Versión 2/)).toBeVisible({ timeout: 30_000 });
  // Restore is not rendered at all for reviewers.
  await expect(page.getByRole('button', { name: 'Restaurar esta versión' })).toHaveCount(0);
  // Reading (view + diff) still works.
  await page.getByRole('button', { name: 'Comparar con anterior' }).first().click();
  await expect(page.getByRole('heading', { name: /Cambios desde/ })).toBeVisible();

  const del = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers });
  if (!del.ok) throw new Error(`cleanup delete failed: ${del.status}`);
});

/**
 * P2-2: the audit filter catalog exposes every backend action/entity
 * type with translated labels (no data dependency: options only).
 */
test('audit log filter catalog exposes planning and webhook options', async ({ page }) => {
  await useApiSession(page);
  await page.goto(`${DASHBOARD}/audit-log`, { waitUntil: 'domcontentloaded' });
  // Board rendered (proves page + locale); the filter selects follow.
  await expect(page.getByRole('heading', { name: 'Auditoría' })).toBeVisible({ timeout: 30_000 });
  const selects = page.getByRole('combobox');
  await expect(selects).toHaveCount(2);
  const action = selects.first();
  for (const label of [
    'Enviar a revisión',
    'Aviso de vencimiento',
    'Aviso de atraso',
    'Suscribir webhook',
    'Actualizar webhook',
    'Rotar secreto',
    'Desuscribir webhook',
    'Probar webhook',
  ]) {
    // Anchored regex: exact option text ('Suscribir webhook' is a
    // substring of 'Desuscribir webhook', so plain hasText matches two).
    await expect(action.locator('option', { hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  }
  const entityType = selects.nth(1);
  for (const label of ['Planificación', 'Webhook']) {
    await expect(entityType.locator('option', { hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  }
});
