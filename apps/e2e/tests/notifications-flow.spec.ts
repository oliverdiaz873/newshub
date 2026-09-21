import { expect, test } from '@playwright/test';
import { EDITOR, REVIEWER, fetchApiToken, switchApiSession, useApiSession } from '../fixtures/auth';

const API = 'http://localhost:3211/api/v1';
const DASHBOARD = 'http://localhost:3212';
// Unique per run: the notification belongs to this test only.
const RUN = Date.now().toString(36);

/**
 * Notification inbox: single-read + deep-link.
 * API publishes an owned article so the fan-out notifies staff other than
 * the actor; the reviewer session then reads one notification and follows
 * another one's deep-link. Global unread counts are never asserted
 * (notifications accumulate by design). Badge polling is out of scope.
 */
test('marking one notification as read and following a deep-link', async ({ page }) => {
  const token = await fetchApiToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const cats = (await (
    await fetch(`${API}/categories?locale=es&limit=100`, { headers })
  ).json()) as { data: Array<{ id: string }> };
  const title = `E2E Notif titulo largo ${RUN}`;
  const created = (await (
    await fetch(`${API}/articles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        categoryId: cats.data[0].id,
        translations: [
          {
            locale: 'es',
            slug: `e2e-notif-${RUN}`,
            title,
            summary: 'Resumen suficientemente largo para la validacion.',
            content: ['Cuerpo para notificaciones.'],
          },
        ],
      }),
    })
  ).json()) as { id: string };
  const id = created.id;

  try {
    const reviewRes = await fetch(`${API}/articles/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'review' }),
    });
    if (!reviewRes.ok) throw new Error(`submit-for-review failed: ${reviewRes.status}`);
    const publishRes = await fetch(`${API}/articles/${id}/publish`, { method: 'POST', headers });
    if (!publishRes.ok) throw new Error(`publish failed: ${publishRes.status}`);

    // The actor (editor) is excluded from the fan-out; the reviewer is notified.
    await useApiSession(page, EDITOR);
    await switchApiSession(page, REVIEWER);
    await page.goto(`${DASHBOARD}/notifications`, { waitUntil: 'domcontentloaded' });
    // Submit-for-review and publish each emit; target the publish event.
    const row = page.getByRole('row', { name: new RegExp(`Publicado.*${title.slice(0, 20)}`) });
    await expect(row).toBeVisible({ timeout: 30_000 });

    await row.getByRole('button', { name: 'Marcar como leída' }).click();
    await expect(row.getByText('Leída')).toBeVisible();

    await row.getByRole('link', { name: new RegExp(title.slice(0, 20)) }).click();
    await expect(page).toHaveURL(new RegExp(`/articles/${id}`), { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Editar artículo' })).toBeVisible();
  } finally {
    // Best-effort cleanup (reseed is the backstop); never masks the test result.
    // Unpublish is a no-op for non-published states, so delete always runs.
    await fetch(`${API}/articles/${id}/unpublish`, { method: 'POST', headers }).catch(
      () => undefined,
    );
    await fetch(`${API}/articles/${id}`, { method: 'DELETE', headers }).catch(() => undefined);
  }
});
