import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

// Unique per run: a leftover row (or a CI retry) would otherwise collide
// with a fixed slug.
const RUN = Date.now().toString(36);
const SLUG = `e2e-autor-${RUN}`;

test('authors CRUD with referential guard', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByLabel('Slug', { exact: true }).fill(SLUG);
  await page.getByLabel('Nombre (es)').fill('E2E Autor');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Autor' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Autor/ });
  await row.getByRole('button', { name: 'Eliminar' }).click();
  // Deletes confirm through the shared ConfirmDialog modal (native
  // window.confirm is gone); the confirm button carries actionDelete.
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Autor' })).toHaveCount(0);
});

test('cannot delete an author with opinions', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  const row = page.getByRole('row', { name: /Redacción/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  // The guard message grew a second sentence (reassignment guidance);
  // assert the current full text.
  await expect(
    page.getByText('No se puede eliminar: todavía tiene opiniones. Reasígnalas o elimínalas primero.'),
  ).toBeVisible();
});
