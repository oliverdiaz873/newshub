import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Search } from '../_components/SearchPageClient';
import { SITE_URL, getLocalePrefix } from '@/shared/config/site';
import { SearchResultsSkeleton } from './loading';

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.search' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    alternates: {
      canonical: `${baseUrl}${path}/search`,
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <Search />
    </Suspense>
  );
}
