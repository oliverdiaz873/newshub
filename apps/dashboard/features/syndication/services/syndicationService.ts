'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Syndication feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL/method/body and returns
 * the raw Response; error handling and response typing stay at the call
 * sites (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

/** GET /webhooks — subscription list. */
export function listWebhooks(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/webhooks');
}

/** POST /webhooks — create subscription. */
export function createWebhook(apiFetch: ApiFetch, url: string, events: string[]): Promise<Response> {
  return apiFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({ url, events }),
  });
}

/** PATCH /webhooks/:id — toggle active flag. */
export function updateWebhook(apiFetch: ApiFetch, id: string, active: boolean): Promise<Response> {
  return apiFetch(`/webhooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

/** DELETE /webhooks/:id — remove subscription. */
export function removeWebhook(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/webhooks/${id}`, { method: 'DELETE' });
}

/** POST /webhooks/:id/rotate — rotate signing secret. */
export function rotateWebhookSecret(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/webhooks/${id}/rotate`, { method: 'POST' });
}

/** POST /webhooks/:id/ping — test ping. */
export function pingWebhook(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/webhooks/${id}/ping`, { method: 'POST' });
}

/** GET /webhooks/:id/deliveries?limit=20 — recent deliveries. */
export function listWebhookDeliveries(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/webhooks/${id}/deliveries?limit=20`);
}
