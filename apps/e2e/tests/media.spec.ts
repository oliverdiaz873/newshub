import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('media upload, cover assignment and protected delete', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/media');
  await page.locator('#file').setInputFiles({ name: 'e2e.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Subir' }).click();
  await expect(page.getByRole('cell', { name: 'image/png' }).first()).toBeVisible();

  await page.goto('/articles');
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Portada (opcional, desde /media)').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill('e2e-cover');
  await page.getByLabel('Título', { exact: true }).first().fill('E2E Portada titulo largo');
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido \(párrafos/).first().fill('Cuerpo con portada.');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Portada titulo largo' })).toBeVisible();

  await page.goto('/media');
  const row = page.getByRole('row', { name: /image\/png/ }).first();
  page.once('dialog', (dialog) => void dialog.accept());
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('No se puede eliminar: está asignada como portada.')).toBeVisible();

  await page.goto('/articles');
  const article = page.getByRole('row', { name: /E2E Portada titulo largo/ });
  page.once('dialog', (dialog) => void dialog.accept());
  await article.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Portada titulo largo' })).toHaveCount(0);

  await page.goto('/media');
  const freed = page.getByRole('row', { name: /image\/png/ }).first();
  page.once('dialog', (dialog) => void dialog.accept());
  await freed.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: /image\/png/ })).toHaveCount(0);
});
