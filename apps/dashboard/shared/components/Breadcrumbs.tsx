'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export interface Crumb {
  href?: string;
  label: string;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const t = useTranslations('nav');
  const label = (value: string) => (value === 'Home' ? t('home') : value);
  return (
    <nav className="nh-breadcrumbs" aria-label={t('home')}>
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;
        return (
          <span key={`${crumb.label}-${index}`}>
            {index > 0 && <span aria-hidden="true"> / </span>}
            {last || !crumb.href ? (
              <span aria-current="page">{label(crumb.label)}</span>
            ) : (
              <Link href={crumb.href}>{label(crumb.label)}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
