import type { Metadata } from 'next';
import { Home } from './_components/HomePageClient';
import { SITE_URL, SITE_NAME } from '@/shared/config/site';
import { getTranslations } from 'next-intl/server';
import {
  apiGet,
  buildHomeContent,
  type ApiArticleListItem,
  type ApiList,
  type ApiOpinionListItem,
  type HomePageContent,
} from '@/lib/api';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });
  return {
    title: `${t('title')} | ${SITE_NAME}`,
    description: t('description'),
    keywords: t('keywords'),
  };
}

/**
 * F7.0 home API-driven (Opción A, D3/D4): featured + recents + breaking +
 * opinions from existing GET endpoints, deterministic frontend composition.
 * No local fallback: any null fetch (API error or unconfigured) throws to
 * the error boundary, same policy as the API-only detail pages.
 */
async function getHomeContent(locale: string): Promise<HomePageContent> {
  const [featured, recents, breaking, opinions] = await Promise.all([
    apiGet<ApiList<ApiArticleListItem>>('/articles?featured=true', locale),
    apiGet<ApiList<ApiArticleListItem>>('/articles?sort=publishedAt:desc', locale),
    apiGet<ApiList<ApiArticleListItem>>('/articles?breaking=true&limit=4', locale),
    apiGet<ApiList<ApiOpinionListItem>>('/opinions?limit=3', locale),
  ]);
  if (!featured || !recents || !breaking || !opinions) {
    throw new Error('Newshub API home failed');
  }
  const t = await getTranslations({ locale, namespace: 'home' });
  return buildHomeContent(
    featured.data,
    recents.data,
    breaking.data,
    opinions.data,
    t('featuredNews'),
  );
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const siteUrl = SITE_URL;

  const initialContent = await getHomeContent(locale);


  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/images/logo/logo.jpg`,
    sameAs: [
      'https://facebook.com/newshub',
      'https://twitter.com/newshub',
      'https://instagram.com/newshub',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Home initialContent={initialContent} />
    </>
  );
}
