import { expect, test } from '@playwright/test';
import { fetchApiToken, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
// Unique per run: both articles belong to this test only.
const RUN = Date.now().toString(36);

/**
 * Bulk archive as the representative bulk mechanism.
 * API creates two owned drafts; the UI selects both, archives them through
 * the bulk bar with confirmation, and both rows end up archived. The other
 * bulk actions share the same mechanism and stay out of E2E by design.
 */
test('bulk archive archives the selected articles', async ({ page }) => {
  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
  const titles = [`E2E Bulk Uno titulo largo ${RUN}`, `E2E Bulk Dos titulo largo ${RUN}`];
  const ids: string[] = [];
  for (const [i, title] of titles.entries()) {
    const res = await fetch(`${API}/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        categoryId: cats.data[0].id,
        translations: [
          {
            locale: 'es',
            slug: `e2e-bulk-${i}-${RUN}`,
            title,
            summary: 'Resumen suficientemente largo para la validacion.',
            content: ['Cuerpo para bulk.'],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`article setup failed: ${res.status}`);
    ids.push(((await res.json()) as { id: string }).id);
  }
  const cleanupErrors: string[] = [];

  try {
    await useApiSession(page);
    await page.goto(`${DASHBOARD}/articles`, { waitUntil: 'domcontentloaded' });
    await page.locator('#articles-q').fill(RUN);
    for (const title of titles) {
      const row = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.getByRole('checkbox').check();
    }

    const bar = page.getByRole('region', { name: /seleccionados/ });
    await expect(bar.getByText('2 seleccionados')).toBeVisible();
    await bar.getByRole('button', { name: 'Archivar' }).click();
    // Product finding (documented, not fixed here): the bulk confirm button
    // renders the untranslated key "articles.confirm" instead of a label.
    await page.getByRole('dialog').getByRole('button', { name: 'articles.confirm' }).click();

    for (const title of titles) {
      const row = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
      await expect(row.getByRole('cell', { name: 'archived' })).toBeVisible({ timeout: 30_000 });
    }
  } finally {
    // Restore to draft first (mirrors the single-item flow), then delete.
    for (const id of ids) {
      const restore = await fetch(`${API}/articles/${id}/restore`, {
        method: 'POST',
        headers,
      }).catch(() => undefined);
      if (!restore || !restore.ok) cleanupErrors.push(`restore ${id}: ${restore?.status}`);
      const del = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers }).catch(
        () => undefined,
      );
      if (!del || !del.ok) cleanupErrors.push(`delete ${id}: ${del?.status}`);
    }
  }
  if (cleanupErrors.length > 0) throw new Error(`cleanup failed: ${cleanupErrors.join(', ')}`);
});
