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

  const article = allArticles.find((item) => item.href.endsWith(`/${slug}`) || item.id === slug);

  const tMeta = await getTranslations({ locale, namespace: 'metadata.article' });

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

  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);
  const canonicalUrl = `${baseUrl}${path}${article.href}`;

  return {
    title,
    description: summary,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      title,
      description: summary,
      url: canonicalUrl,
      images: [article.imageUrl],
      publishedTime: article.datetime,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: summary,
      images: [article.imageUrl],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale, category } = await params;
  const article = allArticles.find((item) => item.href.endsWith(`/${slug}`) || item.id === slug);

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
      <Article />
    </>
  );
}
