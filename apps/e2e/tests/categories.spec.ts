import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

test('categories CRUD with duplicate guard', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/categories');
  await page.getByLabel('Slug (es)').fill('e2e-cat');
  await page.getByLabel('Nombre (es)').fill('E2E Cat');
  await page.getByLabel('Descripción (es)').fill('Categoría de prueba e2e.');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat' })).toBeVisible();

  await page.getByLabel('Slug (es)').fill('e2e-cat');
  await page.getByLabel('Nombre (es)').fill('Duplicada');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByText('Ese slug ya existe para el idioma.')).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Cat/ });
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre (es)').fill('E2E Cat Editada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat Editada' })).toBeVisible();

  const edited = page.getByRole('row', { name: /E2E Cat Editada/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await edited.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Cat Editada' })).toHaveCount(0);
});
