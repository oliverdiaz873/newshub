import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

const STOREFRONT = 'http://localhost:3210';
// Unique per run: every page/API URL is first-touch, so no fetch/route
// cache from previous runs (or earlier in this run) can leak across DB
// reseeds. doubles as cross-run slug isolation.
const RUN = Date.now().toString(36);

test('publish makes content public, unpublish hides it', async ({ page }) => {
  // Unpublish visibility is eventually consistent (ISR revalidate 60s);
  // the suite timeout (60s) would kill the 120s poll first.
  test.setTimeout(180_000);
  await useApiSession(page);
  await page.goto('/articles');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  const slug = `e2e-pub-${RUN}`;
  await page.getByLabel('Slug', { exact: true }).first().fill(slug);
  await page.getByLabel('Título', { exact: true }).first().fill('E2E Publicado titulo largo');
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido \(párrafos/).first().fill('Cuerpo publicado.');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Publicado titulo largo' })).toBeVisible();

  await page.goto(`${STOREFRONT}/es/news/politica/${slug}`);
  // Unknown to the local layer, the server renders the 404 boundary.
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

  await page.goto('/articles');
  const row = page.getByRole('row', { name: /E2E Publicado titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Publicar' }).click();
  await expect(row.getByRole('cell', { name: 'published' })).toBeVisible();

  await page.goto(`${STOREFRONT}/es/news/politica/${slug}`);
  // First-hit Turbopack compile on dev can be slow; the content itself is
  // asserted, not the timing.
  await expect(page.getByRole('heading', { name: 'E2E Publicado titulo largo' })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto('/articles');
  const published = page.getByRole('row', { name: /E2E Publicado titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await published.getByRole('button', { name: 'Despublicar' }).click();
  await expect(published.getByRole('cell', { name: 'draft' })).toBeVisible();

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
  const draft = page.getByRole('row', { name: /E2E Publicado titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await draft.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Publicado titulo largo' })).toHaveCount(0);
});

test('archive and restore cycle', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/articles');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  const archSlug = `e2e-arch-${RUN}`;
  await page.getByLabel('Slug', { exact: true }).first().fill(archSlug);
  await page.getByLabel('Título', { exact: true }).first().fill('E2E Archivado titulo largo');
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido \(párrafos/).first().fill('Cuerpo archivado.');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Archivado titulo largo' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Archivado titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Archivar' }).click();
  await expect(row.getByRole('cell', { name: 'archived' })).toBeVisible();

  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Restaurar' }).click();
  await expect(row.getByRole('cell', { name: 'draft' })).toBeVisible();

  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Archivado titulo largo' })).toHaveCount(0);
});
