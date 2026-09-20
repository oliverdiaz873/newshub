import { expect, test, type Page } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

// Unique per run: fixed titles risk substring collisions with seed data
// and strict-mode violations when the list holds lookalikes.
const RUN = Date.now().toString(36);
const TITLE = `E2E Articulo ${RUN} titulo largo`;

async function createDraft(page: Page) {
  // Creation lives on /articles/new since the editor migration (the
  // /articles list only filters; it has no inline create form).
  await page.goto('/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(`e2e-art-${RUN}`);
  await page.getByLabel('Título', { exact: true }).first().fill(TITLE);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Parrafo uno.\n\nParrafo dos.');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Negative lookahead: /articles/new itself matches /articles/.+/,
  // so exclude it or the assertion passes before onSaved navigates and
  // the follow-up goto races (and loses to) the pending navigation.
  // 30s: cold-route Turbopack compile on dev (see opinions.spec.ts).
  await expect(page).toHaveURL(/\/articles\/(?!new)[^/]+/, { timeout: 30_000 });
  await page.goto('/articles');
  // The editorial list holds 40+ rows across pages; filter by title
  // instead of assuming page 1 (same #articles-q pattern as
  // review-approval.spec.ts).
  await page.locator('#articles-q').fill(TITLE);
  await expect(page.getByRole('row', { name: new RegExp(TITLE) })).toBeVisible();
}

async function confirmDialog(page: Page) {
  // Deletes confirm through the shared ConfirmDialog modal (the native
  // window.confirm flow is gone); the confirm button carries actionDelete.
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
}

test('articles create, edit and delete', async ({ page }) => {
  await useApiSession(page);
  await createDraft(page);

  const row = page.getByRole('row', { name: new RegExp(TITLE) });
  await row.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Slug', { exact: true }).first().fill(`e2e-art-editado-${RUN}`);
  await page.getByRole('button', { name: 'Guardar' }).click();
  // Editar navigates to the detail editor; back to the filtered list.
  await page.goto('/articles');
  await page.locator('#articles-q').fill(TITLE);
  await expect(page.getByRole('row', { name: new RegExp(TITLE) })).toBeVisible();

  const edited = page.getByRole('row', { name: new RegExp(TITLE) });
  await edited.getByRole('button', { name: 'Eliminar' }).click();
  await confirmDialog(page);
  await expect(page.getByRole('row', { name: new RegExp(TITLE) })).toHaveCount(0);
});
