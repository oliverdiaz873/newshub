import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

test('opinions create and delete', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/opinions');
  await page.getByLabel('Autor (requerido)').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill('e2e-op');
  await page.getByLabel('Título', { exact: true }).first().fill('E2E Opinion titulo largo');
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido \(párrafos/).first().fill('Texto de opinion.');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Opinion titulo largo' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Opinion titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Opinion titulo largo' })).toHaveCount(0);
});
