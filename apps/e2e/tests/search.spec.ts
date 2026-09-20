import { expect, test } from '@playwright/test';
import { fetchApiToken } from '../fixtures/auth';

const STOREFRONT = 'http://localhost:3210';
const API = 'http://localhost:3211/api/v1';
// Unique per run: search URLs are first-touch, so no fetch/route cache
// from previous runs can leak across DB reseeds.
const RUN = Date.now().toString(36);

async function apiToken(): Promise<string> {
  return fetchApiToken();
}

const resultHeadings = (pageText: import('@playwright/test').Page) =>
  pageText.locator('main h3').allTextContents();

test('search renders API results in recency order', async ({ page }) => {
  await page.goto(`${STOREFRONT}/es/search?q=de`, { waitUntil: 'domcontentloaded' });
  // Wait for result cards (not the EmptyState heading shown while fetching).
  await expect(page.locator('main article').first()).toBeVisible({ timeout: 30_000 });
  const titles = await page.locator('main h3').allTextContents();
  // Both entities participate, newest publishedAt first (2025-10-11 before 2025-10-04).
  const fraude = titles.findIndex((t) => /fraude financiero/i.test(t));
  const inflacion = titles.findIndex((t) => /inflaci/i.test(t));
  expect(fraude).toBeGreaterThanOrEqual(0);
  expect(inflacion).toBeGreaterThanOrEqual(0);
  expect(fraude).toBeLessThan(inflacion);
});

test('search includes opinions and EN fallback', async ({ page }) => {
  await page.goto(`${STOREFRONT}/es/search?q=democracia`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3', { hasText: /democracia/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  // Seed is ES-only: EN locale resolves with fallback content, not 404.
  await page.goto(`${STOREFRONT}/en/search?q=guerra`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3').first()).toBeVisible({ timeout: 30_000 });
});

test('search matches without accents (unaccent)', async ({ page }) => {
  // API unaccent: `politica` finds `Política`. Documents the accent
  // limitation closed by the backend; no exact-tilde query needed.
  await page.goto(`${STOREFRONT}/es/search?q=politica`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3', { hasText: /pol[ií]tica/i }).first()).toBeVisible({
    timeout: 30_000,
  });
});

test('short and empty queries never hit the API', async ({ page }) => {
  let apiCalls = 0;
  await page.route('**/api/v1/**', (route) => {
    apiCalls += 1;
    return route.continue();
  });
  await page.goto(`${STOREFRONT}/es/search?q=a`, { waitUntil: 'networkidle' });
  // Negative assertion: queries shorter than 2 chars never fetch (see
  // hasSearchQuery in storefront searchUtils + useSearch gate). The bounded
  // wait is the observation window proving no late request fires.
  await page.waitForTimeout(1000);
  // EmptyState legitimately renders its own heading: assert no result cards.
  expect(await page.locator('main article').count()).toBe(0);
  expect(apiCalls).toBe(0);
  await page.goto(`${STOREFRONT}/es/search?q=zzzqnadaxyz`, { waitUntil: 'networkidle' });
  // Settled empty response (auto-retried): replaces the former fixed wait —
  // the assertion itself polls until the API round-trip completes.
  await expect(page.getByText(/No se encontraron|noActiveSearch/i).first()).toBeVisible({
    timeout: 30_000,
  });
  expect(await page.locator('main article').count()).toBe(0);
  const body = await page.content();
  expect(/No se encontraron|noActiveSearch/i.test(body)).toBe(true);
});

test('search page is noindex with base canonical', async ({ page }) => {
  await page.goto(`${STOREFRONT}/es/search?q=inflaci%C3%B3n`);
  const robots = await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots ?? '').toContain('noindex');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical ?? '').not.toContain('?q=');
});

test('stale results never render after query change', async ({ page }) => {
  await page.route('**/api/v1/articles?**', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  await page.route('**/api/v1/opinions?**', async (route) => {
    await new Promise((r) => setTimeout(r, 1200));
    await route.continue();
  });
  await page.goto(`${STOREFRONT}/es/search?q=inflaci%C3%B3n`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3', { hasText: /inflaci/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  // Switch query while B is still in flight: A results must disappear.
  // The storefront clears previous-query results while unsettled (see
  // useSearch settled logic), so assert absence with auto-retry instead of
  // a fixed wait: polls until stale headings are gone.
  await page.goto(`${STOREFRONT}/es/search?q=guerra`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3', { hasText: /inflaci/i })).toHaveCount(0, { timeout: 15_000 });
  expect((await resultHeadings(page)).join(' ')).not.toMatch(/inflaci/i);
  await expect(page.locator('main h3', { hasText: /guerra|ucrania/i }).first()).toBeVisible({
    timeout: 30_000,
  });
});

test('API failure renders the error boundary without local results', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.abort());
  await page.goto(`${STOREFRONT}/es/search?q=inflacion`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '500' })).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('main article').count()).toBe(0);
});

test('publish appears in search, unpublish disappears', async ({ page }) => {
  test.setTimeout(180_000);
  const token = await apiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`)
  ).json()) as { data: Array<{ id: string }> };
  const title = `E2E Search ${RUN} titulo largo`;
  const createRes = await fetch(`${API}/articles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      categoryId: cats.data[0].id,
      translations: [
        {
          locale: 'es',
          slug: `e2e-search-${RUN}`,
          title,
          summary: 'Resumen suficientemente largo para la validacion.',
          content: ['Cuerpo publicado para busqueda.'],
        },
      ],
    }),
  });
  if (!createRes.ok) throw new Error(`API article create failed: ${createRes.status}`);
  const created = (await createRes.json()) as { id: string };
  // Two-step approval: drafts cannot publish directly (409). Submit for
  // review first, then publish — each step asserted, nothing assumed.
  const reviewRes = await fetch(`${API}/articles/${created.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'review' }),
  });
  if (!reviewRes.ok) throw new Error(`API submit-for-review failed: ${reviewRes.status}`);
  const publishRes = await fetch(`${API}/articles/${created.id}/publish`, { method: 'POST', headers });
  if (!publishRes.ok) throw new Error(`API publish failed: ${publishRes.status}`);

  await page.goto(`${STOREFRONT}/es/search?q=${RUN}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h3', { hasText: new RegExp(RUN) }).first()).toBeVisible({
    timeout: 30_000,
  });

  await fetch(`${API}/articles/${created.id}/unpublish`, { method: 'POST', headers });
  // no-store: the unpublish is visible on the next request, no ISR window.
  // Wait for the settled search round-trip (observable network condition)
  // instead of a fixed delay, then assert the empty result.
  const searchResponse = page.waitForResponse(
    (resp) => /\/api\/v1\/articles\?/.test(resp.url()),
    { timeout: 30_000 },
  );
  await page.goto(`${STOREFRONT}/es/search?q=${RUN}`, { waitUntil: 'domcontentloaded' });
  await searchResponse;
  await expect(page.locator('main article')).toHaveCount(0, { timeout: 15_000 });

  await fetch(`${API}/articles/${created.id}`, { method: 'DELETE', headers });
});
