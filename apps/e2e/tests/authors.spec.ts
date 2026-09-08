import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

test('authors CRUD with referential guard', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByLabel('Slug', { exact: true }).fill('e2e-autor');
  await page.getByLabel('Nombre (es)').fill('E2E Autor');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Autor' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Autor/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Autor' })).toHaveCount(0);
});

test('cannot delete an author with opinions', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  const row = page.getByRole('row', { name: /Redacción/ });
  await expect(row).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('No se puede eliminar: todavía tiene opiniones.')).toBeVisible();
});
