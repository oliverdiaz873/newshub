import type { Metadata } from 'next';
import type { ArticleContent } from '@/data/newsModels';
import { Opinion } from '../../_components/OpinionPageClient';
import { SITE_URL, SITE_NAME, getLocalePrefix } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';
import {
  apiGetNoStoreOutcome,
  resolveArticleImage,
  toOpinionDetail,
  toRelatedOpinions,
  type ApiOpinionDetail,
} from '@/lib/api';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const tMeta = await getTranslations({ locale, namespace: 'metadata.article' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);

  // F1.3 metadata API-first: title/description/canonical/hreflang/OG come
  // from the API. No hreflang EN without a real EN translation (fallback).
  const outcome = await apiGetNoStoreOutcome<ApiOpinionDetail>(`/opinions/${slug}`, locale);
  if (outcome.reason === 'ok') {
    const detail = outcome.data;
    const href = `/opiniones/${detail.slug}`;
    const canonicalUrl = `${baseUrl}${path}${href}`;
    const languages = detail.fallback
      ? { es: `${baseUrl}${href}`, 'x-default': `${baseUrl}${href}` }
      : {
          es: `${baseUrl}${href}`,
          en: `${baseUrl}/en${href}`,
          'x-default': `${baseUrl}${href}`,
        };
    const image = resolveArticleImage(baseUrl, detail.cover?.url ?? '');
    return {
      title: detail.title,
      description: detail.summary,
      alternates: { canonical: canonicalUrl, languages },
      openGraph: {
        type: 'article',
        title: detail.title,
        description: detail.summary,
        url: canonicalUrl,
        images: [image],
        publishedTime: detail.firstPublishedAt,
        modifiedTime: detail.updatedAt,
        siteName: SITE_NAME,
      },
      twitter: {
        card: 'summary_large_image',
        title: detail.title,
        description: detail.summary,
        images: [image],
      },
    };
  }
  if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while generating metadata for /opiniones/${slug}`);
  }

  // F4.0 API-only: not-found and unconfigured resolve to notFound metadata.
  return {
    title: tMeta('notFound'),
    description: tMeta('notFoundDescription'),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;

  // F4.0 opinions API-only: the API is the single source.
  // Sidebar comes from `detail.related`. Production policy: not-found and
  // unconfigured → notFound(), error → error boundary (throw).
  let initialArticle: ArticleContent | null = null;
  let initialSidebar: ReturnType<typeof toRelatedOpinions> | null = null;
  const outcome = await apiGetNoStoreOutcome<ApiOpinionDetail>(`/opinions/${slug}`, locale);
  if (outcome.reason === 'ok') {
    initialArticle = toOpinionDetail(outcome.data);
    initialSidebar = toRelatedOpinions(outcome.data.related);
  } else if (outcome.reason === 'not-found' || outcome.reason === 'unconfigured') {
    notFound();
  } else if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while loading /opiniones/${slug}`);
  }

  const article = initialArticle;
  if (!article) {
    notFound();
  }
  const baseUrl = SITE_URL;
  const localePath = getLocalePrefix(locale);

  const tHome = await getTranslations({ locale, namespace: 'metadata.home' });
  const tHomeSection = await getTranslations({ locale, namespace: 'home' });
  const homeLabel = tHome('title');
  const opinionLabel = tHomeSection('opinion');
  const breadcrumbJsonLd = article
    ? buildBreadcrumbJsonLd([
        { name: homeLabel, item: `${baseUrl}${localePath}` },
        { name: opinionLabel, item: `${baseUrl}${localePath}/opiniones` },
        { name: article.title, item: `${baseUrl}${localePath}${article.href}` },
      ])
    : null;

  // F1.3: JSON-LD from the API-first model (@type Article for opinions,
  // NewsArticle for news). Real author when the API provides one.
  const articleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
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
      <Opinion initialArticle={initialArticle} initialSidebar={initialSidebar} />
    </>
  );
}
