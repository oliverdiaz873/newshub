import type { Metadata } from 'next';
import { Privacy } from '../../_components/PrivacyPageClient';
import { SITE_URL, getLocalePrefix } from '@/shared/config/site';

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.legal.privacy' });
  const baseUrl = SITE_URL;
  const path = getLocalePrefix(locale);

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    alternates: {
      canonical: `${baseUrl}${path}/legal/privacy`,
    },
  };
}

export default function Page() {
  return <Privacy />;
}
