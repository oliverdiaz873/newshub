import type { Metadata } from 'next';
import { categoryContent } from '@/data/categories';
import { Category } from '../../_components/CategoryPageClient';
import { SITE_URL, SITE_NAME, getLocalePrefix, getOgLocale } from '@/shared/config/site';
import { buildBreadcrumbJsonLd } from '@/shared/config/seo';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'data.categories' });
  const tMeta = await getTranslations({ locale, namespace: 'metadata.category' });

  const hasCategory = t.has(`${slug}.label`);
  const label = hasCategory ? t(`${slug}.label`) : undefined;
  const description = hasCategory ? t(`${slug}.description`) : undefined;
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);
  const canonicalUrl = `${baseUrl}${path}/category/${slug}`;

  return {
    title: label ?? tMeta('notFound'),
    description: description ?? tMeta('notFoundDescription'),
    keywords: label ? [label, 'noticias', 'información'] : undefined,
    alternates: {
      canonical: canonicalUrl,
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
  const category = categoryContent[slug];

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

  const items = category?.featuredSection
    ? [
        category.featuredSection.primary,
        ...category.featuredSection.secondary,
        ...category.featuredSection.grid,
        ...(category.latestNews ?? []),
      ]
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
      <Category />
    </>
  );
}
