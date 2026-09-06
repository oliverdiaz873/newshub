import type { Metadata } from 'next';
import { Terms } from '../../_components/TermsPageClient';
import { SITE_URL, getLocalePrefix } from '@/shared/config/site';

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.legal.terms' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    alternates: {
      canonical: `${baseUrl}${path}/legal/terms`,
    },
  };
}

export default function Page() {
  return <Terms />;
}
