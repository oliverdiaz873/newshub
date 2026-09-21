import { expect, test } from '@playwright/test';
import { fetchApiToken, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
const STOREFRONT = 'http://localhost:3210';
// Unique per run: articles belong to these tests only.
const RUN = Date.now().toString(36);

async function apiHeaders(): Promise<Record<string, string>> {
  const token = await fetchApiToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function createReviewArticle(slug: string, title: string): Promise<{ id: string }> {
  const headers = await apiHeaders();
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
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
            content: ['Cuerpo para programados.'],
          },
        ],
      }),
    })
  ).json()) as { id: string };
  const reviewRes = await fetch(`${API}/articles/${created.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'review' }),
  });
  if (!reviewRes.ok) throw new Error(`submit-for-review failed: ${reviewRes.status}`);
  return { id: created.id };
}

async function cleanupArticle(id: string) {
  const headers = await apiHeaders();
  // Unpublish is a no-op outside published; delete always runs.
  await fetch(`${API}/articles/${id}/unpublish`, { method: 'POST', headers }).catch(
    () => undefined,
  );
  const del = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers });
  if (!del.ok) throw new Error(`cleanup delete failed: ${del.status}`);
}

/** +48h in datetime-local format, immune to midnight boundaries. */
function editorLocalPlus48h(): { input: string; utcTitle: string } {
  const d = new Date(Date.now() + 48 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    input: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    utcTitle: `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  };
}

/**
 * Schedule -> visible in /scheduled -> cancel -> empty.
 * The cron/worker itself is not tested; only the user-observable contract.
 */
test('schedule appears in scheduled list and cancel clears it', async ({ page }) => {
  const slug = `e2e-sched-${RUN}`;
  const title = `E2E Sched titulo largo ${RUN}`;
  const { id } = await createReviewArticle(slug, title);
  try {
    await useApiSession(page);
    await page.goto(`${DASHBOARD}/articles/${id}`, { waitUntil: 'domcontentloaded' });
    const when = editorLocalPlus48h();
    await page.getByRole('textbox', { name: 'Publicar el (hora del editor)' }).fill(when.input);
    await page.getByRole('button', { name: 'Programar' }).click();
    await expect(page.getByText(/Programado para/)).toBeVisible();

    await page.goto(`${DASHBOARD}/scheduled`, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
    await expect(row).toBeVisible({ timeout: 30_000 });
    // Editor-local time is stored as UTC (same instant, observable contract).
    await expect(page.getByTitle(when.utcTitle)).toBeVisible();
    await expect(row.getByRole('button', { name: 'Publicar ahora' })).toBeVisible();

    await row.getByRole('button', { name: 'Quitar programa' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar programa' }).click();
    await expect(page.getByText('Nada programado.').first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await cleanupArticle(id);
  }
});

/**
 * Publish now from /scheduled publishes immediately and goes public.
 */
test('publish now from scheduled publishes and goes public', async ({ page }) => {
  const slug = `e2e-schednow-${RUN}`;
  const title = `E2E SchedNow titulo largo ${RUN}`;
  const { id } = await createReviewArticle(slug, title);
  try {
    const headers = await apiHeaders();
    const when = new Date(Date.now() + 48 * 3600_000).toISOString();
    const sched = await fetch(`${API}/articles/${id}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scheduledAt: when }),
    });
    if (!sched.ok) throw new Error(`schedule setup failed: ${sched.status}`);

    await useApiSession(page);
    await page.goto(`${DASHBOARD}/scheduled`, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row', { name: new RegExp(title.slice(0, 20)) });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole('button', { name: 'Publicar ahora' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publicar ahora' }).click();
    // The item leaves the scheduled list once published.
    await expect(row).toHaveCount(0, { timeout: 30_000 });

    await page.goto(`${STOREFRONT}/es/news/politica/${slug}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 30_000 });
  } finally {
    await cleanupArticle(id);
  }
});
