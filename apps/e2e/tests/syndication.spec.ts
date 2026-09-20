import { expect, test, type Page } from '@playwright/test';
import { ADMIN, EDITOR, useApiSession } from '../fixtures/auth';

const RUN = Date.now().toString(36);

/** Starts the page as the given role without hitting the login UI. */
async function loginAsRole(page: Page, role: { email: string; password: string }) {
  await useApiSession(page, role);
  await page.goto('/');
}

async function uiLogout(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function gotoSyndication(page: Page) {
  await page.getByRole('link', { name: 'Sindicación' }).click();
  await expect(page).toHaveURL('http://localhost:3212/syndication');
}

test('admin manages webhooks: create, secret once, ping, rotate, delete', async ({ page }) => {
  await loginAsRole(page, ADMIN);
  await gotoSyndication(page);

  const url = `http://127.0.0.1:9/hook-${RUN}`;
  await page.getByRole('button', { name: 'Nuevo webhook' }).click();
  await page.getByLabel('URL (https)').fill(url);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByText('Webhook creado.').first()).toBeVisible();
  // Secret revealed exactly once.
  await expect(page.getByText('Cópialo ahora.').first()).toBeVisible();
  const secret = await page.locator('code').first().textContent();
  expect(secret?.trim().length).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Listo' }).click();

  const row = page.getByRole('row', { name: new RegExp(`hook-${RUN}`) });
  await expect(row).toBeVisible();
  // Secret is gone after dismissing (never listed).
  await expect(page.locator('code')).toHaveCount(0);

  // Ping fails gracefully against a closed port.
  await row.getByRole('button', { name: 'Enviar ping de prueba' }).click();
  await expect(page.getByText('Falló el ping.')).toBeVisible();

  // Rotate reveals a new secret.
  await row.getByRole('button', { name: 'Rotar secreto' }).click();
  await expect(page.getByText('Secreto rotado.').first()).toBeVisible();
  const rotated = await page.locator('code').first().textContent();
  expect(rotated?.trim()).not.toBe(secret?.trim());
  await page.getByRole('button', { name: 'Listo' }).click();

  // Delete with confirm.
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('Webhook eliminado.').first()).toBeVisible();
});

test('editor is blocked from syndication admin', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  await gotoSyndication(page);
  await expect(page.getByText('Rol insuficiente para esta sección.')).toBeVisible();
  await uiLogout(page);
});
