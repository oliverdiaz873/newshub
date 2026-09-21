import { expect, test } from '@playwright/test';
import { ADMIN, fetchApiToken, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
// Unique per run: webhook and article belong to this test only.
const RUN = Date.now().toString(36);

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`E2E setup refused: ${name} is unset.`);
  return value;
}

async function adminHeaders(): Promise<Record<string, string>> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN.email, password: required('E2E_ADMIN_PASSWORD') }),
  });
  if (!res.ok) throw new Error(`admin login failed: ${res.status}`);
  const body = (await res.json()) as { accessToken: string };
  return { Authorization: `Bearer ${body.accessToken}`, 'Content-Type': 'application/json' };
}

/**
 * Publish fan-out: publishing an article records a webhook delivery.
 * The webhook points at a closed loopback port, so `pending` (not success)
 * is the valid observable: the guarantee is "fan-out occurred", proved by
 * the delivery row (entity/event/state/attempts). Retries/HMAC/RSS stay out.
 */
test('publishing an article records a webhook delivery', async ({ page }) => {
  test.setTimeout(300_000);

  // Webhook setup stays in the UI: it is the admin flow under test.
  await useApiSession(page, ADMIN);
  await page.goto(`${DASHBOARD}/syndication`, { waitUntil: 'domcontentloaded' });
  const hookUrl = `http://127.0.0.1:9/hook-${RUN}`;
  await page.getByRole('button', { name: 'Nuevo webhook' }).click();
  await page.getByRole('textbox', { name: 'URL (https)' }).fill(hookUrl);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByText('Webhook creado.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Listo' }).click();
  const hookRow = page.getByRole('row', { name: new RegExp(`hook-${RUN}`) });
  await expect(hookRow).toBeVisible({ timeout: 30_000 });

  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
  const created = (await (
    await fetch(`${API}/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        categoryId: cats.data[0].id,
        translations: [
          {
            locale: 'es',
            slug: `e2e-syndlv-${RUN}`,
            title: `E2E SyndLv titulo largo ${RUN}`,
            summary: 'Resumen suficientemente largo para la validacion.',
            content: ['Cuerpo para syndication.'],
          },
        ],
      }),
    })
  ).json()) as { id: string };
  const id = created.id;
  const cleanupErrors: string[] = [];

  try {
    const reviewRes = await fetch(`${API}/articles/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'review' }),
    });
    if (!reviewRes.ok) throw new Error(`submit-for-review failed: ${reviewRes.status}`);
    const publishRes = await fetch(`${API}/articles/${id}/publish`, { method: 'POST', headers });
    if (!publishRes.ok) throw new Error(`publish failed: ${publishRes.status}`);

    // Fan-out goes through a worker queue: poll the observable condition
    // (delivery row) instead of waiting a fixed delay.
    await expect(async () => {
      await hookRow.getByRole('button', { name: 'Entregas' }).click();
      await expect(
        page.getByRole('cell', { name: `article/${id.slice(0, 8)}` }).first(),
      ).toBeVisible({ timeout: 15_000 });
    }).toPass({ timeout: 180_000 });
    await expect(
      page.getByRole('row', { name: new RegExp(`article/${id.slice(0, 8)}.*published`) }).first(),
    ).toBeVisible();
  } finally {
    // Best-effort cleanup; failures are reported after, never masking the test.
    await fetch(`${API}/articles/${id}/unpublish`, { method: 'POST', headers }).catch(
      () => undefined,
    );
    const delArt = await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers }).catch(
      () => undefined,
    );
    if (!delArt || !delArt.ok) cleanupErrors.push(`delete article: ${delArt?.status}`);
    const adminH = await adminHeaders();
    const hooks = (await (
      await fetch(`${API}/webhooks`, { headers: adminH })
    ).json()) as Array<{ id: string; url: string }>;
    for (const hook of hooks.filter((h) => h.url.includes(`hook-${RUN}`))) {
      const delHook = await fetch(`${API}/webhooks/${hook.id}`, {
        method: 'DELETE',
        headers: adminH,
      }).catch(() => undefined);
      if (!delHook || !delHook.ok) cleanupErrors.push(`delete webhook: ${delHook?.status}`);
    }
  }
  if (cleanupErrors.length > 0) throw new Error(`cleanup failed: ${cleanupErrors.join(', ')}`);
});
