import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

test('anonymous users cannot use the dashboard lists', async ({ page }) => {
  await page.goto('/categories');
  await expect(page.getByText('Sesión requerida. Accede primero.')).toBeVisible();
});

test('anonymous API writes are rejected', async ({ page }) => {
  const res = await page.request.post('http://localhost:3211/api/v1/categories', {
    data: { translations: [{ locale: 'es', slug: 'anon', label: 'Anon' }] },
  });
  expect(res.status()).toBe(401);
});

test('editor and admin share content permissions', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await expect(page.getByRole('heading', { name: 'Autores' })).toBeVisible();
});
