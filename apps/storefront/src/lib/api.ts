/**
 * F1 public-reading adapter (server- and client-safe, no React imports).
 *
 * Reads published content from `GET /api/v1/...` when NEXT_PUBLIC_API_URL is
 * set, otherwise returns null so callers fall back to the local static data
 * layer untouched. Mappers produce the exact local view-model shapes
 * (NewsArticle / FullNewsArticle / OpinionArticle / CategoryPageContent) so
 * pages, translators and styles keep working without rewrites.
 *
 * Deliberately out of F1 scope (documented in FEATURE-001):
 * - home page and category pages (curated composition and ordering have no
 *   API resource in v1; API list ordering cannot reproduce curation)
 * - search results ordering (API `q` contract covered by e2e; client keeps
 *   local ordering until search UX is designed)
 * - legal pages (static, no resource)
 *
 * F1.1 detail API-first: article/opinion detail body, metadata, JSON-LD and
 * related content come from the API. `local ?? API` is replaced by
 * `API-first`; local static data remains only as a development fallback
 * when NEXT_PUBLIC_API_URL is unset.
 */
import type {
  ArticleContent,
  CategoryPageContent,
  FullNewsArticle,
  NewsArticle,
  OpinionArticle,
} from '@/data/newsModels';

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
 * ok → API, not-found → notFound(), error → error boundary (throw),
 * unconfigured → local static data (development only).
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

/**
 * Absolute-safe image URL: absolute API covers (http...) pass through,
 * root-relative paths are resolved against the site base URL.
 */
export function resolveArticleImage(baseUrl: string, imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!imageUrl) return `${baseUrl}${FALLBACK_OG_IMAGE}`;
  return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

/** Client-side fetch (no ISR options). */
export function apiGetClient<T>(path: string, locale: string): Promise<T | null> {
  return get<T>(path, locale, undefined);
}

function datePart(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  return new Date(time).toISOString().slice(0, 10);
}

export function toNewsArticle(item: ApiArticleListItem, categorySlug: string): NewsArticle {
  return {
    id: item.slug,
    title: item.title,
    href: `/news/${categorySlug}/${item.slug}`,
    category: categorySlug,
    date: datePart(item.firstPublishedAt),
    datetime: item.firstPublishedAt,
    summary: item.summary,
    imageUrl: item.cover?.url ?? '',
    alt: item.cover?.alt ?? item.title,
    author: item.author,
    updatedAt: item.updatedAt,
    fallback: item.fallback,
  };
}

export function toFullArticle(
  detail: ApiArticleDetail,
  categorySlug: string,
  relatedNews: NewsArticle[],
): FullNewsArticle {
  // NOTE: callers replace `id` with the local article id when one exists so
  // the next-intl overlay (data.articles.<id>.*) resolves exactly as in the
  // local path. Raw API ids (slugs) miss those keys and render raw values,
  // which is correct only for content without a messages entry.
  // TRANSITORIO hasta F6: el overlay local se elimina con messages/data.*.
  return {
    ...toNewsArticle(detail, categorySlug),
    localeResolved: detail.localeResolved,
    content: detail.content,
    relatedNews,
    breadcrumb: {
      home: detail.breadcrumb.home,
      category: detail.breadcrumb.category,
      current: detail.breadcrumb.current,
    },
  };
}

/**
 * F1.1: related articles come from `detail.related` (same category, API).
 * The API omits `category` on related rows, so their `categorySlug` is
 * empty; fall back to the parent category (identical by construction).
 */
export function toRelatedNews(related: ApiArticleListItem[], categorySlug: string): NewsArticle[] {
  return related.map((item) => toNewsArticle(item, item.categorySlug || categorySlug));
}

export function toOpinionArticle(item: ApiOpinionListItem): OpinionArticle {
  return {
    id: item.slug,
    title: item.title,
    href: `/opiniones/${item.slug}`,
    category: 'Opinión',
    slug: item.slug,
    summary: item.summary,
    imageUrl: item.cover?.url ?? '',
    alt: item.cover?.alt ?? item.title,
    date: datePart(item.firstPublishedAt),
    datetime: item.firstPublishedAt,
    author: item.author,
    updatedAt: item.updatedAt,
    fallback: item.fallback,
  };
}

export function toOpinionDetail(detail: ApiOpinionDetail): ArticleContent {
  return {
    id: detail.slug,
    title: detail.title,
    href: `/opiniones/${detail.slug}`,
    category: 'Opinión',
    date: datePart(detail.firstPublishedAt),
    datetime: detail.firstPublishedAt,
    summary: detail.summary,
    imageUrl: detail.cover?.url ?? '',
    alt: detail.cover?.alt ?? detail.title,
    author: detail.author,
    updatedAt: detail.updatedAt,
    fallback: detail.fallback,
    localeResolved: detail.localeResolved,
    content: detail.content,
    relatedNews: toRelatedOpinions(detail.related),
    breadcrumb: {
      home: detail.breadcrumb.home,
      category: detail.breadcrumb.category,
      current: detail.breadcrumb.current,
    },
  };
}

/** F1.2: opinion sidebar comes from `detail.related` (latest, API). */
export function toRelatedOpinions(related: ApiOpinionListItem[]): OpinionArticle[] {
  return related.map(toOpinionArticle);
}

export type SearchResultItem = NewsArticle | OpinionArticle;

export interface SearchOutcome {
  results: SearchResultItem[];
  totalArticles: number;
  totalOpinions: number;
}

/**
 * F3.0 unified search (frontend composition, no /search endpoint).
 *
 * Parallel `GET /articles?q=` + `GET /opinions?q=` with the F1/F2 outcome
 * policy (no-store, publishing-sensitive): callers map `not-found` (no
 * matches) to empty results, `error` to the error boundary, and
 * `unconfigured` to the development local fallback.
 * Merge order is `firstPublishedAt` DESC (no relevance ranking in v1).
 * Known MVP limitation: API matching is accent-sensitive ILIKE over
 * title/summary only; `economia` does not match `Economía`.
 */
export async function searchAll(
  q: string,
  locale: string,
  limit = 50,
): Promise<{ outcome: 'ok'; data: SearchOutcome } | { outcome: 'error' | 'unconfigured'; data: null }> {
  const encoded = `q=${encodeURIComponent(q)}&limit=${limit}`;
  const [arts, ops] = await Promise.all([
    apiGetNoStoreOutcome<ApiList<ApiArticleListItem>>(`/articles?${encoded}`, locale),
    apiGetNoStoreOutcome<ApiList<ApiOpinionListItem>>(`/opinions?${encoded}`, locale),
  ]);
  if (arts.reason === 'error' || ops.reason === 'error') {
    return { outcome: 'error', data: null };
  }
  if (arts.reason === 'unconfigured' || ops.reason === 'unconfigured') {
    return { outcome: 'unconfigured', data: null };
  }
  const articles = (arts.data?.data ?? []).map((item) => toNewsArticle(item, item.categorySlug));
  const opinions = (ops.data?.data ?? []).map(toOpinionArticle);
  const results: SearchResultItem[] = [...articles, ...opinions].sort((a, b) =>
    b.datetime.localeCompare(a.datetime),
  );
  return {
    outcome: 'ok',
    data: {
      results,
      totalArticles: arts.data?.meta.total ?? 0,
      totalOpinions: ops.data?.meta.total ?? 0,
    },
  };
}

/**
 * F2.0 deterministic category composition (frontend, no new endpoint).
 *
 * Locked rule:
 * - featured pool = articles flagged isFeatured (API order), filled with
 *   latest non-duplicates up to 6;
 * - featuredIds = hrefs used in featured (primary/secondary/grid);
 * - latestNews = first 6 recents not in featuredIds;
 * - opinionArticles = provided separately (GET /opinions?limit=3);
 * - never duplicate an article across sections; thin pools yield fewer
 *   items (callers must tolerate short sections, never assume 4/6/11).
 * - sidebarNews is presentation-only here: latest non-duplicates after
 *   featured+latest (kept for the CategoryPageContent shape; the F2
 *   category render uses the opinions sidebar instead).
 */
export function buildCategoryContent(
  detail: ApiCategoryDetail,
  articles: ApiArticleListItem[],
  opinions: ApiOpinionListItem[],
): CategoryPageContent {
  const mapped = articles.map((item) => toNewsArticle(item, item.categorySlug || detail.slug));
  const seen = new Set<string>();
  const takeUnique = (pool: NewsArticle[], count: number): NewsArticle[] => {
    const out: NewsArticle[] = [];
    for (const article of pool) {
      if (out.length >= count) break;
      if (seen.has(article.href)) continue;
      seen.add(article.href);
      out.push(article);
    }
    return out;
  };
  const curated = takeUnique(
    mapped.filter((article, index) => articles[index]?.isFeatured === true),
    6,
  );
  const featured = [...curated, ...takeUnique(mapped, 6 - curated.length)];
  const latestNews = takeUnique(mapped, 6);
  const sidebarNews = takeUnique(mapped, 5);
  const [primary, ...rest] = featured;
  return {
    slug: detail.slug,
    label: detail.label,
    description: detail.description ?? '',
    featuredSection: {
      title: detail.label,
      primary: primary as NewsArticle,
      secondary: [rest[0], rest[1], rest[2]] as [NewsArticle, NewsArticle, NewsArticle],
      grid: rest.slice(3, 5),
    },
    latestTitle: `Mas en ${detail.label}`,
    latestNews,
    sidebarTitle: 'Opinion',
    sidebarNews,
    opinionArticles: opinions.map(toOpinionArticle),
  };
}
