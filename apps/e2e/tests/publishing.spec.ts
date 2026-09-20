import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

const STOREFRONT = 'http://localhost:3210';
const STOREFRONT_API = 'http://localhost:3211/api/v1';
// Unique per run: every page/API URL is first-touch, so no fetch/route
// cache from previous runs (or earlier in this run) can leak across DB
// reseeds. doubles as cross-run slug isolation.
const RUN = Date.now().toString(36);
// Unique per run (see articles.spec.ts): fixed titles risk strict-mode
// collisions in list cells, whose accessible name appends the slug.
const TITLE_PUB = `E2E Publicado ${RUN} titulo largo`;
const TITLE_ARCH = `E2E Archivado ${RUN} titulo largo`;

test('publish makes content public, unpublish hides it', async ({ page }) => {
  // Unpublish visibility is eventually consistent (ISR revalidate 60s);
  // the suite timeout (60s) would kill the 120s poll first.
  test.setTimeout(180_000);
  await useApiSession(page);
  // Creation lives on /articles/new since the editor migration; the
  // two-step approval (draft -> review -> published) replaced direct
  // draft publishing, so the flow goes through 'Enviar a revisión'.
  const slug = `e2e-pub-${RUN}`;
  await page.goto('/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(slug);
  await page.getByLabel('Título', { exact: true }).first().fill(TITLE_PUB);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Cuerpo publicado.');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Exclude /articles/new itself (see articles.spec.ts).
  await expect(page).toHaveURL(/\/articles\/(?!new)[^/]+/);
  // Capture the detail URL: revisiting the editor later via direct
  // navigation avoids link-click timing on the filtered list.
  const detailUrl = page.url();

  await page.goto(`${STOREFRONT}/es/news/politica/${slug}`);
  // Unknown to the local layer, the server renders the 404 boundary.
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

  await page.goto('/articles');
  // Filter: the editorial list spans pages and drafts sort separately.
  await page.locator('#articles-q').fill(TITLE_PUB);
  const row = page.getByRole('row', { name: new RegExp(TITLE_PUB) });
  await row.getByRole('link', { name: 'Editar' }).click();
  // First-hit Turbopack compile of the detail route can exceed the
  // default 15s on dev (same rationale as the storefront waits below).
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  await page.getByRole('button', { name: 'Publicar' }).click();
  // Published-only editor UI proves the transition (the list is checked later).
  await expect(page.getByRole('button', { name: 'Despublicar para editar' })).toBeVisible();

  // Separate API propagation from storefront rendering: poll the public
  // endpoint first so a failure here points at the API, not the page.
  // (The diag runs proved publish-then-read works; the residual flake
  // was cold-route compile on the storefront dev server.)
  await expect(async () => {
    const res = await fetch(`${STOREFRONT_API}/articles/${slug}?locale=es`);
    expect(res.status).toBe(200);
  }).toPass({ timeout: 30_000 });

  await page.goto(`${STOREFRONT}/es/news/politica/${slug}`);
  // First-hit Turbopack compile on dev can be slow; the content itself is
  // asserted, not the timing.
  await expect(page.getByRole('heading', { name: TITLE_PUB })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto(detailUrl);
  // Published items unpublish from the detail editor (confirm dialog).
  await page.getByRole('button', { name: 'Despublicar para editar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('button', { name: 'Enviar a revisión' })).toBeVisible();

  // ISR/s-maxage (60s) may serve the published version briefly: wait until
  // the unpublish propagates instead of asserting a single snapshot.
  // Unpublished API-only content hits the server 404 boundary (not the
  // client notFound copy, which only renders for locally-known slugs).
  // Single goto + auto-retry expect: the route streams (skeleton first),
  // so polling goto+count() races the stream and always sees 0.
  await page.goto(`${STOREFRONT}/es/news/politica/${slug}`);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible({
    timeout: 120_000,
  });

  await page.goto('/articles');
  await page.locator('#articles-q').fill(TITLE_PUB);
  const draft = page.getByRole('row', { name: new RegExp(TITLE_PUB) });
  await draft.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('row', { name: new RegExp(TITLE_PUB) })).toHaveCount(0);
});

test('archive and restore cycle', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  const archSlug = `e2e-arch-${RUN}`;
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(archSlug);
  await page.getByLabel('Título', { exact: true }).first().fill(TITLE_ARCH);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Cuerpo archivado.');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Exclude /articles/new itself (see articles.spec.ts).
  await expect(page).toHaveURL(/\/articles\/(?!new)[^/]+/);
  await page.goto('/articles');
  await page.locator('#articles-q').fill(TITLE_ARCH);
  await expect(page.getByRole('row', { name: new RegExp(TITLE_ARCH) })).toBeVisible();

  const row = page.getByRole('row', { name: new RegExp(TITLE_ARCH) });
  await row.getByRole('button', { name: 'Archivar' }).click();
  // The archive confirm uses the default label t('confirm'), which has no
  // 'articles' translation (product i18n gap, documented) so the button
  // carries no accessible name for a getByRole lookup. Scope to the
  // dialog and use the design-system danger affordance (the confirm
  // action); keyboard Enter proved focus-unreliable here.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('button.danger').click();
  await expect(row.getByRole('cell', { name: 'archived' })).toBeVisible();

  await row.getByRole('button', { name: 'Restaurar' }).click();
  await expect(row.getByRole('cell', { name: 'draft' })).toBeVisible();

  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('row', { name: new RegExp(TITLE_ARCH) })).toHaveCount(0);
});
