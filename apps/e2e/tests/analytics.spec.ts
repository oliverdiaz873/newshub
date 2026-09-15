import { expect, test, type Page } from '@playwright/test';

const EDITOR = { email: 'editor@newshub.local', password: 'Editor123!' };
const REVIEWER = { email: 'reviewer@newshub.local', password: 'Reviewer123!' };

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Acceder' }).click();
  await expect(page).toHaveURL('http://localhost:3212/');
}

async function uiLogout(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login/);
}

test('overview shows Tier 1 widgets', async ({ page }) => {
  await uiLogin(page, EDITOR.email, EDITOR.password);
  await expect(page.getByText('Tier 1', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publicaciones por semana' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cobertura de idioma' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cola de revisión' })).toBeVisible();
});

test('analytics page loads Tier 1 sections', async ({ page }) => {
  await uiLogin(page, EDITOR.email, EDITOR.password);
  await page.getByRole('link', { name: 'Analíticas' }).click();
  await expect(page).toHaveURL('http://localhost:3212/analytics');
  await expect(page.getByRole('heading', { name: 'Analíticas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publicados por categoría' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Antigüedad de la cola' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carga de planificación' })).toBeVisible();
});

test('editor sees SEO completeness, reviewer is blocked from analytics', async ({ page }) => {
  await uiLogin(page, EDITOR.email, EDITOR.password);
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await expect(page.getByRole('heading', { name: 'Completitud SEO' })).toBeVisible();
  await expect(page.getByText('Completitud 0/100').first()).toBeVisible();

  await uiLogout(page);
  await uiLogin(page, REVIEWER.email, REVIEWER.password);
  await page.getByRole('link', { name: 'Analíticas' }).click();
  await expect(page).toHaveURL('http://localhost:3212/analytics');
  await expect(page.getByText('Rol insuficiente para esta sección.')).toBeVisible();
});
