import type { Metadata } from 'next';
import { Home } from './_components/HomePageClient';
import { SITE_URL, SITE_NAME } from '@/shared/config/site';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });
  return {
    title: `${t('title')} | ${SITE_NAME}`,
    description: t('description'),
    keywords: t('keywords'),
  };
}

export default function Page() {
  const siteUrl = SITE_URL;


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
      <Home />
    </>
  );
}
