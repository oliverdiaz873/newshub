import type { MetadataRoute } from 'next'
import { SITE_URL, getLocalePrefix } from '@/shared/config/site'
import { routing } from '@/i18n/routing'
import { newsArticles, categoryContent } from '@/data/categories'
import { opinionArticles } from '@/data/opinionArticles'

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = routing.locales
  const baseUrl = SITE_URL

  const staticPages = locales.flatMap((locale) =>
    [
      '',
      '/search',
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

  const categoryPages = locales.flatMap((locale) =>
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

  const articlePages = locales.flatMap((locale) =>
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

  const opinionPages = locales.flatMap((locale) =>
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

  return [...staticPages, ...categoryPages, ...articlePages, ...opinionPages]
}
