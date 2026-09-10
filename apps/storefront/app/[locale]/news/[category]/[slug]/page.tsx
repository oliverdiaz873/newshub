import type { Metadata } from 'next';
import { Article } from '../../../_components/ArticlePageClient';
import {
  climaArticles,
  deporteArticles,
  economiaArticles,
  internacionalArticles,
  justiciaArticles,
  politicaArticles,
  saludArticles,
} from '@/data/articleContent';
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

const allArticles: FullNewsArticle[] = [
  ...politicaArticles,
  ...deporteArticles,
  ...economiaArticles,
  ...internacionalArticles,
  ...justiciaArticles,
  ...climaArticles,
  ...saludArticles,
];

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

  // F1.3 metadata API-first: the API is the source for title, description,
  // canonical, hreflang, OG and published/modified times. The next-intl
  // overlay (data.articles.<id>.*) applies only when a local key exists.
  // Consistency with the body is mandatory: API mismatch/404 with a
  // configured API resolves to notFound metadata (never local metadata
  // for content the body will not render).
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
    const local = allArticles.find((item) => item.href.endsWith(`/${slug}`) || item.id === slug);
    let title = detail.title;
    let summary = detail.summary;
    if (local) {
      const tArticles = await getTranslations({ locale, namespace: 'data.articles' });
      if (tArticles.has(`${local.id}.title`)) title = tArticles(`${local.id}.title`);
      if (tArticles.has(`${local.id}.summary`)) summary = tArticles(`${local.id}.summary`);
    }
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

  // Development fallback only (NEXT_PUBLIC_API_URL unset): legacy local
  // resolution. With a configured API, a 404 means unpublished/unknown and
  // the body renders notFound(), so metadata must not leak local content.
  if (outcome.reason !== 'unconfigured') {
    return {
      title: tMeta('notFound'),
      description: tMeta('notFoundDescription'),
    };
  }
  const article = allArticles.find((item) => item.href.endsWith(`/${slug}`) || item.id === slug);

  if (!article) {
    return {
      title: tMeta('notFound'),
      description: tMeta('notFoundDescription'),
    };
  }

  const tArticles = await getTranslations({ locale, namespace: 'data.articles' });
  const articleId = article.id;

  const hasTitle = tArticles.has(`${articleId}.title`);
  const title = hasTitle ? tArticles(`${articleId}.title`) : article.title;

  const hasSummary = tArticles.has(`${articleId}.summary`);
  const summary = hasSummary ? tArticles(`${articleId}.summary`) : article.summary;

  const canonicalUrl = `${baseUrl}${path}${article.href}`;

  return {
    title,
    description: summary,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        es: `${baseUrl}${article.href}`,
        en: `${baseUrl}/en${article.href}`,
        'x-default': `${baseUrl}${article.href}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description: summary,
      url: canonicalUrl,
      images: [resolveArticleImage(baseUrl, article.imageUrl)],
      publishedTime: article.datetime,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: summary,
      images: [resolveArticleImage(baseUrl, article.imageUrl)],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale, category } = await params;
  const local = allArticles.find((item) => item.href.endsWith(`/${slug}`) || item.id === slug);

  // F1.1 detail API-first: the API has absolute precedence.
  // - ok + category match → API article with detail.related.
  // - ok + category mismatch → notFound() (never silent local).
  // - not-found → notFound() (unpublished/unknown has no valid fallback).
  // - error (5xx/network with API configured) → throw to error.tsx.
  // - unconfigured (no NEXT_PUBLIC_API_URL) → development local fallback.
  // TRANSITORIO hasta F6: keeps the LOCAL id when one exists so the
  // next-intl overlay (data.articles.<id>.*) resolves as in the local path.
  let initialArticle: FullNewsArticle | null = null;
  // Publishing-sensitive: no Data Cache so unpublish 404s on next request.
  const outcome = await apiGetNoStoreOutcome<ApiArticleDetail>(`/articles/${slug}`, locale);
  if (outcome.reason === 'ok') {
    const apiDetail = outcome.data;
    if (apiDetail.categorySlug !== category) {
      notFound();
    }
    initialArticle = {
      ...toFullArticle(apiDetail, category, toRelatedNews(apiDetail.related, category)),
      id: local?.id ?? apiDetail.slug,
    };
  } else if (outcome.reason === 'not-found') {
    notFound();
  } else if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while loading /news/${category}/${slug}`);
  }

  const article = initialArticle ?? local;
  if (!article || article.href !== `/news/${category}/${slug}`) {
    notFound();
  }

  const baseUrl = SITE_URL;
  const localePath = getLocalePrefix(locale);

  const tHome = await getTranslations({ locale, namespace: 'metadata.home' });
  const tCategories = await getTranslations({ locale, namespace: 'data.categories' });
  const homeLabel = tHome('title');
  const categoryLabel = tCategories.has(`${category}.label`) ? tCategories(`${category}.label`) : category;
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

