import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NotFoundClient } from './_components/NotFoundClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'system' });

  return {
    title: t('notFound.title'),
    robots: { index: false },
  };
}

export default function NotFound() {
  return <NotFoundClient />;
}
