'use client';

import { useTranslations } from 'next-intl';

export function LoadingFallback() {
  const t = useTranslations('common');
  return <main className="nh-shell-narrow">{t('loading')}</main>;
}
