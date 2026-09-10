import type { MetadataRoute } from 'next'
import { SITE_URL, getLocalePrefix } from '@/shared/config/site'
import { routing } from '@/i18n/routing'
import { newsArticles, categoryContent } from '@/data/categories'
import { opinionArticles } from '@/data/opinionArticles'
import {
  apiGet,
  toNewsArticle,
  toOpinionArticle,
  type ApiArticleListItem,
  type ApiList,
  type ApiOpinionListItem,
} from '@/lib/api'

type Entry = MetadataRoute.Sitemap[number]

interface ApiCategoryListItem {
  slug: string
}

function alternates(baseUrl: string, href: string) {
  return {
    languages: {
      es: `${baseUrl}${href}`,
      en: `${baseUrl}/en${href}`,
      'x-default': `${baseUrl}${href}`,
    },
  }
}

/**
 * H3: sitemap merges the local layer with API-published content so
 * dashboard-published articles/opinions become crawlable. The public API
 * only returns `published` rows, so unpublish/archive automatically drops
 * URLs on the next Data Cache revalidation (60s, see src/lib/api.ts).
 * Without NEXT_PUBLIC_API_URL the output is exactly the legacy local map,
 * so `next build` never requires a running backend.
 */
async function fetchAll<T>(path: string, locale: string): Promise<T[] | null> {
  const items: T[] = []
  let page = 1
  for (;;) {
    const res = await apiGet<ApiList<T>>(`${path}?limit=100&page=${page}`, locale)
    if (!res) return page === 1 ? null : items
    items.push(...res.data)
    if (page >= res.meta.totalPages) return items
    page += 1
  }
}

function mergeByUrl(localEntries: Entry[], apiEntries: Entry[]): Entry[] {
  const seen = new Set(apiEntries.map((e) => e.url))
  return [...apiEntries, ...localEntries.filter((e) => !seen.has(e.url))]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const locales = routing.locales
  const baseUrl = SITE_URL

  // F2.3: /search is intentionally excluded (query pages must not be
  // indexed). Static entries are UI routes; editorial URLs come from the
  // API-primary merge below (local branches remain as dev-build fallback).
  const staticPages = locales.flatMap((locale) =>
    [
      '',
      '/legal/privacy',
      '/legal/terms',
    ].map((route) => ({
      url: `${baseUrl}${getLocalePrefix(locale)}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
      alternates: {
        languages: {
          es: `${baseUrl}${route}`,
          en: `${baseUrl}/en${route}`,
          'x-default': `${baseUrl}${route}`,
        },
      },
    }))
  )

  const localCategoryPages: Entry[] = locales.flatMap((locale) =>
    Object.keys(categoryContent).map((slug) => ({
      url: `${baseUrl}${getLocalePrefix(locale)}/category/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      alternates: {
        languages: {
          es: `${baseUrl}/category/${slug}`,
          en: `${baseUrl}/en/category/${slug}`,
          'x-default': `${baseUrl}/category/${slug}`,
        },
      },
    }))
  )

  const localArticlePages: Entry[] = locales.flatMap((locale) =>
    newsArticles.map((article) => ({
      url: `${baseUrl}${getLocalePrefix(locale)}${article.href}`,
      lastModified: new Date(article.datetime),
      changeFrequency: 'daily' as const,
      priority: 0.6,
      alternates: {
        languages: {
          es: `${baseUrl}${article.href}`,
          en: `${baseUrl}/en${article.href}`,
          'x-default': `${baseUrl}${article.href}`,
        },
      },
    }))
  )

  const localOpinionPages: Entry[] = locales.flatMap((locale) =>
    opinionArticles.map((article) => ({
      url: `${baseUrl}${getLocalePrefix(locale)}${article.href}`,
      lastModified: new Date(article.datetime),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
      alternates: {
        languages: {
          es: `${baseUrl}${article.href}`,
          en: `${baseUrl}/en${article.href}`,
          'x-default': `${baseUrl}${article.href}`,
        },
      },
    }))
  )

  const apiCategoryPages: Entry[] = []
  const apiArticlePages: Entry[] = []
  const apiOpinionPages: Entry[] = []
  for (const locale of locales) {
    const [cats, arts, ops] = await Promise.all([
      fetchAll<ApiCategoryListItem>('/categories', locale),
      fetchAll<ApiArticleListItem>('/articles', locale),
      fetchAll<ApiOpinionListItem>('/opinions', locale),
    ])
    const prefix = getLocalePrefix(locale)
    for (const c of cats ?? []) {
      if (!c.slug) continue
      const href = `/category/${c.slug}`
      apiCategoryPages.push({
        url: `${baseUrl}${prefix}${href}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: alternates(baseUrl, href),
      })
    }
    for (const a of arts ?? []) {
      if (!a.slug || !a.categorySlug) continue
      const href = toNewsArticle(a, a.categorySlug).href
      apiArticlePages.push({
        url: `${baseUrl}${prefix}${href}`,
        lastModified: new Date(a.updatedAt),
        changeFrequency: 'daily' as const,
        priority: 0.6,
        alternates: alternates(baseUrl, href),
      })
    }
    for (const o of ops ?? []) {
      if (!o.slug) continue
      const href = toOpinionArticle(o).href
      apiOpinionPages.push({
        url: `${baseUrl}${prefix}${href}`,
        lastModified: new Date(o.updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
        alternates: alternates(baseUrl, href),
      })
    }
  }

  return [
    ...staticPages,
    ...mergeByUrl(localCategoryPages, apiCategoryPages),
    ...mergeByUrl(localArticlePages, apiArticlePages),
    ...mergeByUrl(localOpinionPages, apiOpinionPages),
  ]
}
