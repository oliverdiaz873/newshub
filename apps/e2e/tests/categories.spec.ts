import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

// Unique per run: a leftover row (or a CI retry re-running this test against
// the same database) would otherwise collide with a fixed slug.
const RUN = Date.now().toString(36);
const SLUG = `e2e-cat-${RUN}`;

test('categories CRUD with duplicate guard', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/categories');
  await page.getByLabel('Slug (es)').fill(SLUG);
  await page.getByLabel('Nombre (es)').fill('E2E Cat');
  await page.getByLabel('Descripción (es)').fill('Categoría de prueba e2e.');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat' })).toBeVisible();

  await page.getByLabel('Slug (es)').fill(SLUG);
  await page.getByLabel('Nombre (es)').fill('Duplicada');
  await page.getByRole('button', { name: 'Crear' }).click();
  // Duplicate slugs surface as a field error on esSlug (invalidSlug),
  // not as the former standalone slugTaken text.
  await expect(page.locator('#cat-esSlug-err')).toHaveText('Solo minúsculas, números y guiones.');

  const row = page.getByRole('row', { name: /E2E Cat/ });
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre (es)').fill('E2E Cat Editada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat Editada' })).toBeVisible();

  const edited = page.getByRole('row', { name: /E2E Cat Editada/ });
  await edited.getByRole('button', { name: 'Eliminar' }).click();
  // Deletes confirm through the shared ConfirmDialog modal.
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat Editada' })).toHaveCount(0);
});
