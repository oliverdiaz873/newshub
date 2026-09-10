import type { Metadata } from 'next';
import { categoryContent } from '@/data/categories';
import type { CategoryPageContent, NewsArticle } from '@/data/newsModels';
import { Category } from '../../_components/CategoryPageClient';
import { SITE_URL, SITE_NAME, getLocalePrefix, getOgLocale } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';
import {
  apiGetNoStoreOutcome,
  buildCategoryContent,
  type ApiArticleListItem,
  type ApiCategoryDetail,
  type ApiList,
  type ApiOpinionListItem,
} from '@/lib/api';

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

  // F2.1 metadata API-first: label/description/canonical/hreflang/OG come
  // from GET /categories/:slug. Overlay data.categories.* applies only
  // when a local key exists. description:null falls back to the generic
  // category description (never empty, never local content for missing).
  const outcome = await apiGetNoStoreOutcome<ApiCategoryDetail>(`/categories/${slug}`, locale);
  if (outcome.reason === 'ok') {
    const detail = outcome.data;
    const t = await getTranslations({ locale, namespace: 'data.categories' });
    const label = t.has(`${detail.slug}.label`) ? t(`${detail.slug}.label`) : detail.label;
    const description = t.has(`${detail.slug}.description`)
      ? t(`${detail.slug}.description`)
      : (detail.description ?? tMeta('description'));
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

  // Development fallback only (NEXT_PUBLIC_API_URL unset).
  if (outcome.reason !== 'unconfigured') {
    return {
      title: tMeta('notFound'),
      description: tMeta('notFoundDescription'),
    };
  }
  const t = await getTranslations({ locale, namespace: 'data.categories' });

  const hasCategory = t.has(`${slug}.label`);
  const label = hasCategory ? t(`${slug}.label`) : undefined;
  const description = hasCategory ? t(`${slug}.description`) : undefined;

  return {
    title: label ?? tMeta('notFound'),
    description: description ?? tMeta('notFoundDescription'),
    keywords: label ? [label, 'noticias', 'información'] : undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        es: `${baseUrl}/category/${slug}`,
        en: `${baseUrl}/en/category/${slug}`,
        'x-default': `${baseUrl}/category/${slug}`,
      },
    },
    openGraph: {
      title: label ?? tMeta('notFound'),
      description: description ?? tMeta('notFoundDescription'),
      url: canonicalUrl,
      type: 'website',
      siteName: SITE_NAME,
      locale: getOgLocale(locale),
    },
    twitter: {
      card: 'summary_large_image',
      title: label ?? tMeta('notFound'),
      description: description ?? tMeta('notFoundDescription'),
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug, locale } = await params;

  // F2.1 category API-first: detail + article list + opinions sidebar are
  // fetched with no-store (locked rule, no ISR60 in F2 render).
  // - ok → API composition via buildCategoryContent (deterministic, deduped).
  // - not-found → notFound() (unknown/empty category has no fallback).
  // - error → throw to error.tsx (never silent local in production).
  // - unconfigured → development local fallback (categoryContent).
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
  } else if (detailOutcome.reason === 'not-found') {
    notFound();
  } else if (detailOutcome.reason === 'error') {
    throw new Error(`Newshub API unavailable while loading /category/${slug}`);
  }

  const category = initialContent ?? categoryContent[slug];

  if (!category) {
    notFound();
  }

  const baseUrl = SITE_URL;
  const localePath = getLocalePrefix(locale);

  const tHome = await getTranslations({ locale, namespace: 'metadata.home' });
  const tCategories = await getTranslations({ locale, namespace: 'data.categories' });
  const homeLabel = tHome('title');
  const categoryLabel = tCategories.has(`${slug}.label`) ? tCategories(`${slug}.label`) : slug;
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
