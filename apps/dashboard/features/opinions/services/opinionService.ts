'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Opinions feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL/method/body and returns
 * the raw Response; error handling and response typing stay at the call
 * sites (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

export interface OpinionCreatePayload {
  authorId: string;
  coverMediaId?: string;
  translations: Array<{
    locale: string;
    slug: string;
    title: string;
    summary: string;
    content: string[];
  }>;
}

/** GET /editorial/opinions?... — list with caller-built filters. */
export function listOpinions(apiFetch: ApiFetch, params: URLSearchParams): Promise<Response> {
  return apiFetch(`/editorial/opinions?${params.toString()}`);
}

/** GET /editorial/opinions/:id — single editorial read. */
export function getOpinion(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/editorial/opinions/${id}`);
}

/** GET /authors — author reference list. */
export function getOpinionAuthors(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/authors');
}

/** POST /opinions — create. */
export function createOpinion(apiFetch: ApiFetch, payload: OpinionCreatePayload): Promise<Response> {
  return apiFetch('/opinions', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /opinions/:id — update (body built by the caller). */
export function updateOpinion(apiFetch: ApiFetch, id: string, body: Record<string, unknown>): Promise<Response> {
  return apiFetch(`/opinions/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /opinions/:id — remove. */
export function removeOpinion(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/opinions/${id}`, { method: 'DELETE' });
}

/** POST /opinions/:id/:action — publish|unpublish|archive|restore|reject. */
export function transitionOpinion(
  apiFetch: ApiFetch,
  id: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return apiFetch(`/opinions/${id}/${action}`, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** GET /editorial/opinions?scheduled=true — scheduled view source (Fase 9 consumer). */
export function listScheduledOpinions(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/opinions?scheduled=true&limit=50&locale=es');
}
