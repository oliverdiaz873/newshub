'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Media feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL/method/body and returns
 * the raw Response; error handling and response typing stay at the call
 * sites (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

/** GET /media?page=&limit= — server-paginated manager list. */
export function listMedia(apiFetch: ApiFetch, page: number, limit: number): Promise<Response> {
  return apiFetch(`/media?page=${page}&limit=${limit}`);
}

/** GET /media?limit=100 — picker option list (single fetch by design). */
export function listMediaOptions(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/media?limit=100');
}

/** POST /media — upload (caller builds FormData and validates client-side). */
export function uploadMedia(apiFetch: ApiFetch, form: FormData): Promise<Response> {
  return apiFetch('/media', { method: 'POST', body: form });
}

/** DELETE /media/:id — remove (server rejects with media_in_use when linked). */
export function removeMedia(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/media/${id}`, { method: 'DELETE' });
}
