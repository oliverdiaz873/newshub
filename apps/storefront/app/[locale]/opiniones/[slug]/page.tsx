import type { Metadata } from 'next';
import { opinionDetails } from '@/data';
import { Opinion } from '../../_components/OpinionPageClient';
import { SITE_URL, SITE_NAME, getLocalePrefix } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const tMeta = await getTranslations({ locale, namespace: 'metadata.article' });
  const article = opinionDetails[slug];
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);
  const canonicalUrl = article ? `${baseUrl}${path}${article.href}` : `${baseUrl}${path}/opiniones/${slug}`;

  if (!article) {
    return {
      title: tMeta('notFound'),
      description: tMeta('notFoundDescription'),
    };
  }

  return {
    title: article.title,
    description: article.summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      url: canonicalUrl,
      images: [article.imageUrl],
      publishedTime: article.datetime,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: [article.imageUrl],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;
  const article = opinionDetails[slug];

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

  const articleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.summary,
        image: `${baseUrl}${article.imageUrl}`,
        datePublished: article.datetime,
        dateModified: article.datetime,
        author: {
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
      <Opinion />
    </>
  );
}
