'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Articles feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL/method/body and returns
 * the raw Response; error handling and response typing stay at the call
 * sites (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

export interface ArticleCreatePayload {
  categoryId: string;
  authorId?: string;
  coverMediaId?: string;
  translations: Array<{
    locale: string;
    slug: string;
    title: string;
    summary: string;
    content: string[];
  }>;
}

/** GET /editorial/articles?... — list with caller-built filters. */
export function listArticles(apiFetch: ApiFetch, params: URLSearchParams): Promise<Response> {
  return apiFetch(`/editorial/articles?${params.toString()}`);
}

/** GET /editorial/articles/:id — single editorial read. */
export function getArticle(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/editorial/articles/${id}`);
}

/** GET /editorial/categories?locale=es&limit=100 — category reference list. */
export function getArticleCategories(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/categories?locale=es&limit=100');
}

/** GET /authors — author reference list. */
export function getArticleAuthors(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/authors');
}

/** POST /articles — create. */
export function createArticle(apiFetch: ApiFetch, payload: ArticleCreatePayload): Promise<Response> {
  return apiFetch('/articles', { method: 'POST', body: JSON.stringify(payload) });
}

/** PATCH /articles/:id — update (body built by the caller). */
export function updateArticle(apiFetch: ApiFetch, id: string, body: Record<string, unknown>): Promise<Response> {
  return apiFetch(`/articles/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

/** DELETE /articles/:id — remove. */
export function removeArticle(apiFetch: ApiFetch, id: string): Promise<Response> {
  return apiFetch(`/articles/${id}`, { method: 'DELETE' });
}

/** POST /articles/:id/:action — publish|unpublish|archive|restore|reject. */
export function transitionArticle(
  apiFetch: ApiFetch,
  id: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return apiFetch(`/articles/${id}/${action}`, {
    method: 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** POST /articles/bulk — bulk action over ids. */
export function bulkArticles(apiFetch: ApiFetch, action: string, ids: string[]): Promise<Response> {
  return apiFetch('/articles/bulk', { method: 'POST', body: JSON.stringify({ action, ids }) });
}

/** GET /editorial/articles?scheduled=true — scheduled view source (Fase 9 consumer). */
export function listScheduledArticles(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/articles?scheduled=true&limit=50&locale=es');
}
