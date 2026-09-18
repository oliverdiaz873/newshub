/**
 * Shared HTTP infrastructure (server- and client-safe, no React imports).
 *
 * Reads published content from `GET /api/v1/...` when NEXT_PUBLIC_API_URL is
 * set, otherwise returns null so callers fall back to the local static data
 * layer untouched.
 *
 * Ownership: solo infraestructura generica (base URL, fetch con locale,
 * ISR 60s / no-store publishing-sensitive, outcome ok/not-found/error/
 * unconfigured, contratos Api*). La logica propia del dominio editorial
 * (mappers toNews/toOpinion, searchAll, imagenes) vive en
 * `features/news/services/news-content` y la composicion de paginas
 * (buildHome/buildCategory) en `app/[locale]/_lib/page-content`.
 */

export interface ApiCover {
  url: string;
  alt: string;
}

export interface ApiAuthorRef {
  slug: string;
  name: string;
  bio: string | null;
}

export interface ApiList<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  localeRequested: string;
  localeResolved: string;
  fallback: boolean;
}

export interface ApiArticleListItem {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  summary: string;
  cover: ApiCover | null;
  author: ApiAuthorRef | null;
  firstPublishedAt: string;
  updatedAt: string;
  fallback: boolean;
  isBreaking: boolean;
  isFeatured: boolean;
}

export interface ApiArticleDetail extends ApiArticleListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: ApiArticleListItem[];
  localeRequested: string;
  localeResolved: string;
}

export interface ApiOpinionListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover: ApiCover | null;
  author: ApiAuthorRef;
  firstPublishedAt: string;
  updatedAt: string;
  fallback: boolean;
}

export interface ApiOpinionDetail extends ApiOpinionListItem {
  content: string[];
  breadcrumb: { home: string; category: string; current: string };
  related: ApiOpinionListItem[];
  localeRequested: string;
  localeResolved: string;
}

export interface ApiCategoryDetail {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
  articleCount: number;
  localeRequested: string;
  localeResolved: string;
  fallback: boolean;
}

export function getApiBase(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  return base ? base.replace(/\/+$/, '') : null;
}

async function get<T>(path: string, locale: string, revalidate?: number, noStore?: boolean): Promise<T | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const separator = path.includes('?') ? '&' : '?';
    const init = noStore
      ? { cache: 'no-store' as const }
      : revalidate === undefined
        ? undefined
        : { next: { revalidate } };
    const res = await fetch(
      `${base}${path}${separator}locale=${encodeURIComponent(locale)}`,
      init,
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Server-side fetch with ISR (revalidate 60s, mirrors API Cache-Control). */
export function apiGet<T>(path: string, locale: string): Promise<T | null> {
  return get<T>(path, locale, 60);
}

/**
 * Publishing-sensitive detail: no Data Cache so publish/unpublish is
 * visible on the next request instead of serving the 60s stale entry.
 * Localized use only (article detail); lists keep apiGet ISR.
 */
export function apiGetNoStore<T>(path: string, locale: string): Promise<T | null> {
  return get<T>(path, locale, undefined, true);
}

/**
 * F1.1 detail outcome: distinguishes why a detail fetch produced no data.
 *
 * - `ok`: API returned the resource.
 * - `not-found`: API answered 404 (unknown slug, unpublished, or locale miss).
 * - `error`: API answered 5xx or the request failed (network/DNS/CORS).
 * - `unconfigured`: NEXT_PUBLIC_API_URL is unset (development fallback).
 *
 * Detail pages use this to apply the production fallback policy:
 * ok -> API, not-found -> notFound(), error -> error boundary (throw),
 * unconfigured -> local static data (development only).
 */
export type ApiFetchOutcome<T> =
  | { data: T; reason: 'ok' }
  | { data: null; reason: 'not-found' | 'error' | 'unconfigured' };

async function getOutcome<T>(path: string, locale: string): Promise<ApiFetchOutcome<T>> {
  const base = getApiBase();
  if (!base) return { data: null, reason: 'unconfigured' };
  try {
    const separator = path.includes('?') ? '&' : '?';
    const res = await fetch(
      `${base}${path}${separator}locale=${encodeURIComponent(locale)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) {
      return { data: null, reason: res.status === 404 ? 'not-found' : 'error' };
    }
    return { data: (await res.json()) as T, reason: 'ok' };
  } catch {
    return { data: null, reason: 'error' };
  }
}

/** Detail fetch with outcome (no-store, publishing-sensitive). */
export function apiGetNoStoreOutcome<T>(path: string, locale: string): Promise<ApiFetchOutcome<T>> {
  return getOutcome<T>(path, locale);
}

/** Fallback OG/JSON-LD image when an article has no cover. Never emits "". */
export const FALLBACK_OG_IMAGE = '/images/logo/logo.jpg';

/** Client-side fetch (no ISR options). */
export function apiGetClient<T>(path: string, locale: string): Promise<T | null> {
  return get<T>(path, locale, undefined);
}
