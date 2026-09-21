import { expect, test } from '@playwright/test';

const STOREFRONT = 'http://localhost:3210';
const API = 'http://localhost:3211/api/v1';

/**
 * Public storefront smoke (read-only, no setup, no cleanup).
 * Covers the public routes that search.spec (search) and publishing.spec
 * (article detail) never visit: category pages, opinion detail and the EN
 * home. Assertions avoid seed-specific titles so the suite survives content
 * changes; slugs are discovered via the public API when needed.
 */

test('valid category renders its heading and article cards', async ({ page }) => {
  await page.goto(`${STOREFRONT}/es/category/politica`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Política', exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('main article').first()).toBeVisible({ timeout: 30_000 });
});

test('unknown category renders the 404 boundary with a way home', async ({ page }) => {
  await page.goto(`${STOREFRONT}/es/category/zzz-sin-categoria`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Volver a la portada', exact: true })).toBeVisible();
});

test('opinion detail renders title, content and related opinions', async ({ page }) => {
  // Discover a real opinion slug via the public API instead of hardcoding one.
  const res = await page.request.get(`${API}/opinions?locale=es&limit=1`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { data: Array<{ slug: string }> };
  expect(body.data.length).toBeGreaterThan(0);
  const slug = body.data[0].slug;

  await page.goto(`${STOREFRONT}/es/opiniones/${slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('navigation', { name: 'breadcrumb' })).toBeVisible();
  await expect(page.locator('main article').first()).toBeVisible({ timeout: 30_000 });
});

test('EN home renders translated navigation and sections', async ({ page }) => {
  await page.goto(`${STOREFRONT}/en`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Politics' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Featured News' })).toBeVisible();
  await expect(page.locator('main article').first()).toBeVisible({ timeout: 30_000 });
});
