'use client';

import type { ApiFetch } from '@/shared/api/auth';
import type { AuthorPayload } from '../types';

/**
 * Authors feature service — thin wrappers over shared/api.
 * Raw Response return; error handling stays at the call sites.
 */

/** GET /authors — whole editorial list (client filter + pager). */
export function listAuthors(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/authors');
}

/** POST /authors — create. */
export function createAuthor(apiFetch: ApiFetch, payload: AuthorPayload): Promise<Response> {
  return apiFetch('/authors', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /authors/:id — update. */
export function updateAuthor(apiFetch: ApiFetch, id: string, payload: AuthorPayload): Promise<Response> {
  return apiFetch(`/authors/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** DELETE /authors/:id — remove (409 when opinions are linked). */
export function removeAuthor(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/authors/${id}`, { method: 'DELETE' });
}
