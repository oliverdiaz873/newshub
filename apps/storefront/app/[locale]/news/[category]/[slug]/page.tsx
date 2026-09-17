import type { Metadata } from 'next';
import { Article } from '../../../_components/ArticlePageClient';
import type { FullNewsArticle } from '@/data/newsModels';
import { SITE_URL, SITE_NAME, getLocalePrefix } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';
import {
  apiGetNoStoreOutcome,
  resolveArticleImage,
  toFullArticle,
  toRelatedNews,
  type ApiArticleDetail,
} from '@/lib/api';

type PageProps = {
  params: Promise<{ locale: string; category: string; slug: string }>;
};

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug, category } = await params;
  const tMeta = await getTranslations({ locale, namespace: 'metadata.article' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);

  // F4.0 metadata API-only: the API is the source for title, description,
  // canonical, hreflang, OG and published/modified times.
  // Consistency with the body is mandatory: API mismatch/404 (or API
  // unconfigured) resolves to notFound metadata (never local metadata).
  const outcome = await apiGetNoStoreOutcome<ApiArticleDetail>(`/articles/${slug}`, locale);
  if (outcome.reason === 'ok') {
    if (outcome.data.categorySlug !== category) {
      return {
        title: tMeta('notFound'),
        description: tMeta('notFoundDescription'),
      };
    }
    const detail = outcome.data;
    const href = `/news/${category}/${detail.slug}`;
    const canonicalUrl = `${baseUrl}${path}${href}`;
    const title = detail.title;
    const summary = detail.summary;
    // No hreflang EN without a real EN translation (detail.fallback).
    const languages = detail.fallback
      ? { es: `${baseUrl}${href}`, 'x-default': `${baseUrl}${href}` }
      : {
          es: `${baseUrl}${href}`,
          en: `${baseUrl}/en${href}`,
          'x-default': `${baseUrl}${href}`,
        };
    const image = resolveArticleImage(baseUrl, detail.cover?.url ?? '');
    return {
      title,
      description: summary,
      alternates: { canonical: canonicalUrl, languages },
      openGraph: {
        type: 'article',
        title,
        description: summary,
        url: canonicalUrl,
        images: [image],
        publishedTime: detail.firstPublishedAt,
        modifiedTime: detail.updatedAt,
        siteName: SITE_NAME,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: summary,
        images: [image],
      },
    };
  }
  if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while generating metadata for /news/${category}/${slug}`);
  }

  // F4.0 API-only: not-found and unconfigured resolve to notFound metadata.
  return {
    title: tMeta('notFound'),
    description: tMeta('notFoundDescription'),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale, category } = await params;

  // F4.0 detail API-only: the API is the single source.
  // - ok + category match → API article with detail.related.
  // - ok + category mismatch → notFound() (never silent local).
  // - not-found → notFound() (unpublished/unknown has no valid fallback).
  // - error (5xx/network with API configured) → throw to error.tsx.
  // - unconfigured (no NEXT_PUBLIC_API_URL) → notFound().
  let initialArticle: FullNewsArticle | null = null;
  // Publishing-sensitive: no Data Cache so unpublish 404s on next request.
  const outcome = await apiGetNoStoreOutcome<ApiArticleDetail>(`/articles/${slug}`, locale);
  if (outcome.reason === 'ok') {
    const apiDetail = outcome.data;
    if (apiDetail.categorySlug !== category) {
      notFound();
    }
    initialArticle = toFullArticle(apiDetail, category, toRelatedNews(apiDetail.related, category));
  } else if (outcome.reason === 'not-found' || outcome.reason === 'unconfigured') {
    notFound();
  } else if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while loading /news/${category}/${slug}`);
  }

  const article = initialArticle;
  if (!article || article.href !== `/news/${category}/${slug}`) {
    notFound();
  }

  const baseUrl = SITE_URL;
  const localePath = getLocalePrefix(locale);

  const tHome = await getTranslations({ locale, namespace: 'metadata.home' });
  const tNews = await getTranslations({ locale, namespace: 'news' });
  const homeLabel = tHome('title');
  const categoryLabel = tNews.has(`category.labels.${category}`)
    ? tNews(`category.labels.${category}`)
    : category;
  const breadcrumbJsonLd = article
    ? buildBreadcrumbJsonLd([
        { name: homeLabel, item: `${baseUrl}${localePath}` },
        { name: categoryLabel, item: `${baseUrl}${localePath}/category/${category}` },
        { name: article.title, item: `${baseUrl}${localePath}${article.href}` },
      ])
    : null;

  const articleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.summary,
        image: resolveArticleImage(baseUrl, article.imageUrl),
        datePublished: article.datetime,
        dateModified: article.updatedAt ?? article.datetime,
        author: article.author
          ? {
              '@type': 'Person',
              name: article.author.name,
            }
          : {
              '@type': 'Organization',
              name: SITE_NAME,
            },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/images/logo/logo.jpg`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${baseUrl}${localePath}${article.href}`,
        },
      }
    : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      <Article initialArticle={initialArticle} />
    </>
  );
}

