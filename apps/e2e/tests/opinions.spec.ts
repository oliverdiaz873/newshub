import { expect, test } from '@playwright/test';
import { useApiSession } from '../fixtures/auth';

// Unique per run: a leftover row (or a CI retry) would otherwise collide
// with a fixed slug/title.
const RUN = Date.now().toString(36);
const SLUG = `e2e-op-${RUN}`;
const TITLE = `E2E Opinion titulo largo ${RUN}`;

test('opinions create and delete', async ({ page }) => {
  await useApiSession(page);
  // Creation lives on /opinions/new since the editor migration (the
  // /opinions list has no inline form); the author field is now
  // 'Autor (obligatorio)'.
  await page.goto('/opinions');
  await page.getByRole('link', { name: 'Nueva opinión' }).click();
  await expect(page).toHaveURL('http://localhost:3212/opinions/new');
  await page.getByLabel('Autor (obligatorio)').selectOption({ index: 1 });
  await page.getByLabel('Slug', { exact: true }).first().fill(SLUG);
  await page.getByLabel('Título', { exact: true }).first().fill(TITLE);
  await page.getByLabel('Resumen', { exact: true }).first().fill('Resumen suficientemente largo para la validacion.');
  await page.getByLabel(/Contenido/, { exact: true }).first().fill('Texto de opinion.');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  // Negative lookahead: /opinions/new itself matches /opinions/.+/,
  // so exclude it (see articles.spec.ts). 30s: cold-route Turbopack
  // compile on dev, same rationale as publishing.spec.ts.
  await expect(page).toHaveURL(/\/opinions\/(?!new)[^/]+/, { timeout: 30_000 });
  await page.goto('/opinions');
  await expect(page.getByRole('cell', { name: TITLE })).toBeVisible();

  const row = page.getByRole('row', { name: new RegExp(TITLE) });
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('cell', { name: TITLE })).toHaveCount(0);
});
