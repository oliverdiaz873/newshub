'use client';

import type { ApiFetch } from '@/shared/api/auth';

/**
 * Analytics feature service — thin wrappers over shared/api.
 * Each function builds the feature-specific URL and returns the raw
 * Response; error handling and response typing stay at the call sites
 * (unchanged behavior). No Repository/Adapter/Facade patterns.
 */

/** GET /editorial/categories?limit=100&locale=es — category distribution source. */
export function listAnalyticsCategories(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/categories?limit=100&locale=es');
}

/** GET /editorial/articles?limit=20&status=review — review-age source (articles). */
export function listAnalyticsReviewArticles(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/articles?limit=20&status=review');
}

/** GET /editorial/opinions?limit=20&status=review — review-age source (opinions). */
export function listAnalyticsReviewOpinions(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/editorial/opinions?limit=20&status=review');
}

/** GET /planning?limit=1 — open planning count source (meta.total). */
export function countOpenPlanning(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/planning?limit=1');
}

/** GET /planning?limit=1&overdue=true — overdue planning count source (meta.total). */
export function countOverduePlanning(apiFetch: ApiFetch): Promise<Response> {
  return apiFetch('/planning?limit=1&overdue=true');
}
