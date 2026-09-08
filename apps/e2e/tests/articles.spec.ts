import { expect, test, type Page } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

async function createDraft(page: Page) {
  await page.goto('/articles');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill('e2e-art');
  await page.getByLabel('Título', { exact: true }).first().fill('E2E Articulo titulo largo');
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido \(párrafos/).first().fill('Parrafo uno.\n\nParrafo dos.');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Articulo titulo largo' })).toBeVisible();
}

test('articles create, edit and delete', async ({ page }) => {
  await useApiSession(page);
  await createDraft(page);

  const row = page.getByRole('row', { name: /E2E Articulo titulo largo/ });
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Slug', { exact: true }).first().fill('e2e-art-editado');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Articulo titulo largo' })).toBeVisible();

  const edited = page.getByRole('row', { name: /E2E Articulo titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await edited.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Articulo titulo largo' })).toHaveCount(0);
});
