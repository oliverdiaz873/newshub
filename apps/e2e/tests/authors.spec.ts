import { expect, test } from '@playwright/test';
import { REVIEWER, useApiSession } from '../fixtures/auth';

// Unique per run: a leftover row (or a CI retry) would otherwise collide
// with a fixed slug.
const RUN = Date.now().toString(36);
const SLUG = `e2e-autor-${RUN}`;

test('authors CRUD with referential guard', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByLabel('Slug', { exact: true }).fill(SLUG);
  await page.getByLabel('Nombre (es)').fill('E2E Autor');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Autor' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Autor/ });
  await row.getByRole('button', { name: 'Eliminar' }).click();
  // Deletes confirm through the shared ConfirmDialog modal (native
  // window.confirm is gone); the confirm button carries actionDelete.
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  // The seed row proves the list loaded, so the zero-count below cannot pass
  // falsely on a failed load.
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /E2E Autor/ })).toHaveCount(0);
});

test('cannot delete an author with opinions', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  const row = page.getByRole('row', { name: /Redacción/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Eliminar' }).click();
  const conflict = page.waitForResponse(
    (res) =>
      res.request().method() === 'DELETE' &&
      res.url().includes('/api/v1/authors/') &&
      res.status() === 409,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await conflict;
  // The guard message grew a second sentence (reassignment guidance);
  // assert the current full text.
  await expect(
    page.getByText('No se puede eliminar: todavía tiene opiniones. Reasígnalas o elimínalas primero.'),
  ).toBeVisible();
  // The referenced author must survive the rejected delete.
  await expect(row).toBeVisible();
});

test('duplicate slug shows taken error (Inc1)', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  // 'redaccion' ships with the E2E seed; reusing it must surface slugTaken,
  // not the generic invalidSlug message.
  await page.getByLabel('Slug', { exact: true }).fill('redaccion');
  await page.getByLabel('Nombre (es)').fill('Duplicado');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.locator('#au-slug-err')).toHaveText('Ese slug ya existe.');
});

test('required validation blocks empty submit (Inc1)', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.locator('#au-slug-err')).toHaveText('Este campo es obligatorio.');
});

test('reviewer sees read-only authors list (Inc2)', async ({ page }) => {
  await useApiSession(page, REVIEWER);
  await page.goto('/authors');
  // List must load first so the zero-counts below are meaningful.
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
});

test('edit author and save (Inc5)', async ({ page }) => {
  const slug = `e2e-edit-${RUN}`;
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page.getByLabel('Nombre (es)').fill('E2E Editable');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Editable' })).toBeVisible();

  const row = page.getByRole('row', { name: /E2E Editable/ });
  await row.getByRole('button', { name: 'Editar' }).click();
  await expect(page.locator('#au-slug')).toHaveValue(slug);
  await page.getByLabel('Nombre (es)').fill('E2E Editado');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Editado' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'E2E Editable' })).toHaveCount(0);

  // Cleanup: the run-unique author must not leak into other runs.
  const edited = page.getByRole('row', { name: /E2E Editado/ });
  await edited.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /E2E Editado/ })).toHaveCount(0);
});

test('search persists in URL (Inc5)', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await page.locator('#au-q').fill('redaccion');
  await expect(page).toHaveURL(/q=redaccion/);
  await page.reload();
  await expect(page.locator('#au-q')).toHaveValue('redaccion');
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await page.locator('#au-q').fill('');
  await expect(page).toHaveURL(/\/authors$/);
});

test('per-page persists in URL (Inc5)', async ({ page }) => {
  await useApiSession(page);
  await page.goto('/authors');
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await page.getByLabel('Por página').selectOption('50');
  await expect(page).toHaveURL(/limit=50/);
  await page.reload();
  await expect(page.getByLabel('Por página')).toHaveValue('50');
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
});

test('dirty guard asks before discarding (Inc5)', async ({ page }) => {
  const slug = `e2e-dirty-${RUN}`;
  await useApiSession(page);
  await page.goto('/authors');
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page.getByLabel('Nombre (es)').fill('E2E Sucio');
  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Sucio' })).toBeVisible();

  // Make the form dirty, then switch rows: the discard dialog must appear
  // instead of silently wiping the input.
  const row = page.getByRole('row', { name: /E2E Sucio/ });
  await row.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre (es)').fill('E2E Modificado');
  await page.getByRole('row', { name: /Redacción/ }).getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Descartar cambios')).toBeVisible();
  await dialog.getByRole('button', { name: 'Salir' }).click();
  // The form now holds the second author; the unsaved edit is gone.
  await expect(page.locator('#au-slug')).toHaveValue('redaccion');

  // Cancel with a dirty form asks as well; confirming resets to create mode.
  await page.getByLabel('Slug', { exact: true }).fill(`${slug}-x`);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('dialog').getByText('Descartar cambios')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Salir' }).click();
  await expect(page.getByRole('button', { name: 'Crear' })).toBeVisible();
  await expect(page.locator('#au-slug')).toHaveValue('');

  // Cleanup.
  const dirty = page.getByRole('row', { name: /E2E Sucio/ });
  await dirty.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('row', { name: /Redacción/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /E2E Sucio/ })).toHaveCount(0);
});
