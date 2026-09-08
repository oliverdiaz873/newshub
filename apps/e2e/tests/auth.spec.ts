import { expect, test } from '@playwright/test';
import { loginAs, logout } from '../fixtures/auth';

test('login success lands on categories', async ({ page }) => {
  await loginAs(page);
  await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Política' })).toBeVisible();
});

test('wrong password stays on login with message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('editor@newshub.local');
  await page.getByLabel('Contraseña').fill('wrongpass1');
  await page.getByRole('button', { name: 'Acceder' }).click();
  await expect(page.getByText('Credenciales inválidas.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('logout returns to login', async ({ page }) => {
  await loginAs(page);
  await logout(page);
});
