import type { Metadata } from 'next';
import type { CategoryPageContent, NewsArticle } from '@/data/newsModels';
import { Category } from '../../_components/CategoryPageClient';
import { SITE_URL, SITE_NAME, getLocalePrefix, getOgLocale } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';
import {
  apiGetNoStoreOutcome,
  type ApiArticleListItem,
  type ApiCategoryDetail,
  type ApiList,
  type ApiOpinionListItem,
} from '@/lib/api';
import { buildCategoryContent } from '../../_lib/page-content';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const tMeta = await getTranslations({ locale, namespace: 'metadata.category' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);
  const canonicalUrl = `${baseUrl}${path}/category/${slug}`;

  // F10.0 metadata API-only: label/description/canonical/hreflang/OG come
  // from GET /categories/:slug. description:null falls back to the generic
  // metadata.category.description (never empty, never placeholder).
  const outcome = await apiGetNoStoreOutcome<ApiCategoryDetail>(`/categories/${slug}`, locale);
  if (outcome.reason === 'ok') {
    const detail = outcome.data;
    const label = detail.label;
    const description = detail.description ?? tMeta('description', { label });
    const languages = detail.fallback
      ? { es: `${baseUrl}/category/${slug}`, 'x-default': `${baseUrl}/category/${slug}` }
      : {
          es: `${baseUrl}/category/${slug}`,
          en: `${baseUrl}/en/category/${slug}`,
          'x-default': `${baseUrl}/category/${slug}`,
        };
    return {
      title: label,
      description,
      keywords: [label, 'noticias', 'información'],
      alternates: { canonical: canonicalUrl, languages },
      openGraph: {
        title: label,
        description,
        url: canonicalUrl,
        type: 'website',
        siteName: SITE_NAME,
        locale: getOgLocale(locale),
      },
      twitter: {
        card: 'summary_large_image',
        title: label,
        description,
      },
    };
  }
  if (outcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while generating metadata for /category/${slug}`);
  }

  // F4.0 API-only: not-found and unconfigured resolve to notFound metadata.
  return {
    title: tMeta('notFound'),
    description: tMeta('notFoundDescription'),
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;

  // F4.0 category API-only: detail + article list + opinions sidebar are
  // fetched with no-store (locked rule, no ISR60 in F2 render).
  // - ok → API composition via buildCategoryContent (deterministic, deduped).
  // - not-found/unconfigured → notFound() (unknown/empty category has no fallback).
  // - error → throw to error.tsx (never silent local in production).
  let initialContent: CategoryPageContent | null = null;
  const detailOutcome = await apiGetNoStoreOutcome<ApiCategoryDetail>(`/categories/${slug}`, locale);
  if (detailOutcome.reason === 'ok') {
    const [artsOutcome, opsOutcome] = await Promise.all([
      apiGetNoStoreOutcome<ApiList<ApiArticleListItem>>(
        `/articles?category=${encodeURIComponent(slug)}&limit=100`,
        locale,
      ),
      apiGetNoStoreOutcome<ApiList<ApiOpinionListItem>>('/opinions?limit=3', locale),
    ]);
    if (artsOutcome.reason === 'error' || opsOutcome.reason === 'error') {
      throw new Error(`Newshub API unavailable while loading /category/${slug}`);
    }
    initialContent = buildCategoryContent(
      detailOutcome.data,
      artsOutcome.reason === 'ok' ? artsOutcome.data.data : [],
      opsOutcome.reason === 'ok' ? opsOutcome.data.data : [],
    );
  } else if (detailOutcome.reason === 'not-found' || detailOutcome.reason === 'unconfigured') {
    notFound();
  } else if (detailOutcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while loading /category/${slug}`);
  }

  const category = initialContent;

  if (!category) {
    notFound();
  }

  const baseUrl = SITE_URL;
  const localePath = getLocalePrefix(locale);

  const tHome = await getTranslations({ locale, namespace: 'metadata.home' });
  const tNews = await getTranslations({ locale, namespace: 'news' });
  const homeLabel = tHome('title');
  const categoryLabel = tNews.has(`category.labels.${slug}`)
    ? tNews(`category.labels.${slug}`)
    : slug;
  const breadcrumbJsonLd = category
    ? buildBreadcrumbJsonLd([
        { name: homeLabel, item: `${baseUrl}${localePath}` },
        { name: categoryLabel, item: `${baseUrl}${localePath}/category/${slug}` },
      ])
    : null;

  // F2.0: thin API pools leave tuple slots undefined; drop them before
  // SEO so ItemList never crashes and positions stay dense.
  const items = category?.featuredSection
    ? [
        category.featuredSection.primary,
        ...category.featuredSection.secondary,
        ...category.featuredSection.grid,
        ...(category.latestNews ?? []),
      ].filter((article): article is NewsArticle => article != null)
    : [];

  const collectionJsonLd = category
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: category.label,
        description: category.description,
        url: `${baseUrl}${localePath}/category/${slug}`,
        mainEntity: {
          '@type': 'ItemList',
          name: category.label,
          numberOfItems: items.length,
          itemListElement: items.map((article, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: article.title,
            url: `${baseUrl}${localePath}${article.href}`,
          })),
        },
        provider: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: baseUrl,
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
      {collectionJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        />
      )}
      <Category initialContent={initialContent} />
    </>
  );
}
