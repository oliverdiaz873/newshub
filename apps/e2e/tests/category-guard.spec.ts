import { expect, test } from '@playwright/test';
import { fetchApiToken, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
// Unique per run: category and article belong to this test only.
const RUN = Date.now().toString(36);

/**
 * Referential guard: a category with articles cannot be deleted.
 * API creates an owned category + article and removes both afterwards
 * (even when an intermediate assertion fails); the UI proves the 409
 * rejection and that nothing was partially deleted. No toast is asserted:
 * the current UI surfaces the conflict without a persistent message.
 */
test('deleting a category with articles is rejected and deletes nothing', async ({ page }) => {
  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const catSlug = `e2e-catguard-${RUN}`;
  const catName = `E2E CatGuard ${RUN}`;
  const createCatRes = await fetch(`${API}/categories?locale=es`, {
    method: 'POST',
    headers,
      body: JSON.stringify({
        sort: 0,
        translations: [{ locale: 'es', slug: catSlug, label: catName }],
      }),
  });
  if (!createCatRes.ok) throw new Error(`category setup failed: ${createCatRes.status}`);
  const createdCat = (await createCatRes.json()) as { id: string };
  const categoryId = createdCat.id;

  const artSlug = `e2e-catguard-art-${RUN}`;
  const artTitle = `E2E CatGuard Art ${RUN} titulo largo`;
  const createArtRes = await fetch(`${API}/articles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      categoryId,
      translations: [
        {
          locale: 'es',
          slug: artSlug,
          title: artTitle,
          summary: 'Resumen suficientemente largo para la validacion.',
          content: ['Cuerpo para guard.'],
        },
      ],
    }),
  });
  if (!createArtRes.ok) throw new Error(`article setup failed: ${createArtRes.status}`);
  const createdArt = (await createArtRes.json()) as { id: string };
  const articleId = createdArt.id;

  try {
    await useApiSession(page);
    await page.goto(`${DASHBOARD}/categories`, { waitUntil: 'domcontentloaded' });
    const row = page.getByRole('row', { name: new RegExp(catName) });
    await expect(row).toBeVisible({ timeout: 30_000 });

    // The rejection itself: DELETE answers 409 (observed, not assumed).
    const conflict = page.waitForResponse(
      (resp) => resp.request().method() === 'DELETE' && resp.url().includes('/categories/'),
      { timeout: 30_000 },
    );
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    const resp = await conflict;
    expect(resp.status()).toBe(409);

    // Nothing was partially deleted: category row still listed…
    await expect(row).toBeVisible();
    // …and the associated article is still intact.
    await page.goto(`${DASHBOARD}/articles`, { waitUntil: 'domcontentloaded' });
    await page.locator('#articles-q').fill(artTitle);
    await expect(
      page.getByRole('row', { name: new RegExp(artTitle) }).first(),
    ).toBeVisible({ timeout: 30_000 });
  } finally {
    // Best-effort cleanup (reseed is the backstop); never masks the test result.
    await fetch(`${API}/articles/${articleId}`, { method: 'DELETE', headers }).catch(() => undefined);
    await fetch(`${API}/categories/${categoryId}`, { method: 'DELETE', headers }).catch(
      () => undefined,
    );
  }
});
