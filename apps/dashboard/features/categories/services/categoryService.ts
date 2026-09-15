'use client';

import type { ApiFetch } from '@/shared/api/auth';
import type { CategoryPayload } from '../types';

/**
 * Categories feature service — thin wrappers over shared/api.
 * Raw Response return; error handling stays at the call sites.
 */

/** GET /editorial/categories?locale=&limit=100 — catalog for locale. */
export function listCategories(apiFetch: ApiFetch, locale: string): Promise<Response> {
  return apiFetch(`/editorial/categories?locale=${locale}&limit=100`);
}

/** POST /categories?locale=es — create. */
export function createCategory(apiFetch: ApiFetch, payload: CategoryPayload): Promise<Response> {
  return apiFetch('/categories?locale=es', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /categories/:id?locale=es — update. */
export function updateCategory(apiFetch: ApiFetch, id: string, payload: CategoryPayload): Promise<Response> {
  return apiFetch(`/categories/${id}?locale=es`, { method: 'PATCH', body: JSON.stringify(payload) });
}

/** DELETE /categories/:id — remove (409 when articles are linked). */
export function removeCategory(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/categories/${id}`, { method: 'DELETE' });
}
