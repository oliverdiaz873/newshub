/**
 * features/news/services/news-content
 *
 * Lógica propia del dominio editorial (ownership news).
 * Esta carpeta existe porque hay lógica de news que vivía en
 * `src/lib/api.ts`, NO porque "toda feature deba tener services/".
 * (Precisión aprobada del plan: ownership manda, no la simetría.)
 *
 * Contiene: mappers API → view-model, resolución de imágenes,
 * búsqueda unificada y tipos de resultado de búsqueda.
 * La infraestructura HTTP genérica (get/apiGet/no-store) permanece
 * en `src/lib/api.ts` y se consume desde aquí (features → shared).
 */
import type {
  ArticleContent,
  FullNewsArticle,
  NewsArticle,
  OpinionArticle,
} from '@/data/newsModels';
import {
  FALLBACK_OG_IMAGE,
  apiGetNoStoreOutcome,
  type ApiArticleDetail,
  type ApiArticleListItem,
  type ApiList,
  type ApiOpinionDetail,
  type ApiOpinionListItem,
} from '@/lib/api';

/** Fallback OG image lives in shared infra; imported above. */

/**
 * Absolute-safe image URL: absolute API covers (http...) pass through,
 * root-relative paths are resolved against the site base URL.
 */
export function resolveArticleImage(baseUrl: string, imageUrl: string): string {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (!imageUrl) return `${baseUrl}${FALLBACK_OG_IMAGE}`;
  return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
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
  // NOTE: `id` is the API slug; no next-intl overlay applies (F10.0).
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
