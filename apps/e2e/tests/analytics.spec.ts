import { expect, test, type Page } from '@playwright/test';
import { EDITOR, REVIEWER, switchApiSession, useApiSession } from '../fixtures/auth';

/** Starts the page as the given role without hitting the login UI. */
async function loginAsRole(page: Page, role: { email: string; password: string }) {
  await useApiSession(page, role);
  await page.goto('/');
}

test('overview shows Tier 1 widgets', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  await expect(page.getByText('Tier 1', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publicaciones por semana' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cobertura de idioma' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cola de revisión' })).toBeVisible();
});

test('analytics page loads Tier 1 sections', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  await page.getByRole('link', { name: 'Analíticas' }).click();
  await expect(page).toHaveURL('http://localhost:3212/analytics');
  await expect(page.getByRole('heading', { name: 'Analíticas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Publicados por categoría' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Antigüedad de la cola' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carga de planificación' })).toBeVisible();
});

test('editor sees SEO completeness, reviewer is blocked from analytics', async ({ page }) => {
  await loginAsRole(page, EDITOR);
  await page.getByRole('link', { name: 'Artículos' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles');
  await page.getByRole('link', { name: 'Nuevo artículo' }).click();
  await expect(page).toHaveURL('http://localhost:3212/articles/new');
  await expect(page.getByRole('heading', { name: 'Completitud SEO' })).toBeVisible();
  await expect(page.getByText('Completitud 0/100').first()).toBeVisible();

  await switchApiSession(page, REVIEWER);
  await page.getByRole('link', { name: 'Analíticas' }).click();
  await expect(page).toHaveURL('http://localhost:3212/analytics');
  await expect(page.getByText('Rol insuficiente para esta sección.')).toBeVisible();
});
