/**
 * app/[locale]/_lib/page-content
 *
 * Composición determinista de páginas (ownership app/).
 * Son reglas de curaduría de página (pools, dedup por href, slices),
 * no lógica propia del dominio news: por eso viven en app/ y no en
 * features/news/services/. Solo las consumen las route pages.
 */
import type { CategoryPageContent, NewsArticle, OpinionArticle } from '@/data/newsModels';
import { toNewsArticle, toOpinionArticle } from '@/features/news/services/news-content';
import type {
  ApiArticleListItem,
  ApiCategoryDetail,
  ApiOpinionListItem,
} from '@/lib/api';

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

/**
 * F4.0 deterministic home composition (frontend, no new endpoint).
 *
 * Locked rule (Opción A, D3/D4):
 * - featured pool = GET /articles?featured=true (API order, publishedAt desc),
 *   filled with GET /articles?sort=publishedAt:desc non-duplicates up to 6;
 * - latestNews = first 6 recents not seen in featured;
 * - breakingNews = GET /articles?breaking=true&limit=4 pool (may overlap with
 *   featured/latest: the ticker duplicates by design, as the static one did);
 * - opinionArticles = GET /opinions?limit=3 (separate namespace, no dedup);
 * - never invent items; thin pools yield fewer items (callers must tolerate
 *   short sections and hide empty ones, never assume 1+3+2/6/4/3).
 */
export interface HomePageContent {
  featuredSection: {
    title: string;
    primary: NewsArticle | undefined;
    secondary: (NewsArticle | undefined)[];
    grid: NewsArticle[];
  };
  latestNews: NewsArticle[];
  opinionArticles: OpinionArticle[];
  breakingNews: NewsArticle[];
}

export function buildHomeContent(
  featuredRaw: ApiArticleListItem[],
  recentRaw: ApiArticleListItem[],
  breakingRaw: ApiArticleListItem[],
  opinionsRaw: ApiOpinionListItem[],
  featuredTitle: string,
): HomePageContent {
  const featuredMapped = featuredRaw.map((item) => toNewsArticle(item, item.categorySlug));
  const recentMapped = recentRaw.map((item) => toNewsArticle(item, item.categorySlug));
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
  const curated = takeUnique(featuredMapped, 6);
  const featured = [...curated, ...takeUnique(recentMapped, 6 - curated.length)];
  const latestNews = takeUnique(recentMapped, 6);
  const breakingNews = breakingRaw
    .map((item) => toNewsArticle(item, item.categorySlug))
    .slice(0, 4);
  const opinionArticles = opinionsRaw.map(toOpinionArticle).slice(0, 3);
  const [primary, ...rest] = featured;
  return {
    featuredSection: {
      title: featuredTitle,
      primary,
      secondary: [rest[0], rest[1], rest[2]],
      grid: rest.slice(3, 5),
    },
    latestNews,
    opinionArticles,
    breakingNews,
  };
}
