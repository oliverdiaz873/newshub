'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('system');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4">
      <div className="mx-auto max-w-[500px] text-center">
        <h1 className="mb-4 text-4xl font-bold text-[var(--color-accent-primary)]">
          500
        </h1>
        <h2 className="mb-2 text-2xl font-bold text-[var(--color-text-primary)]">
          {t('error.title')}
        </h2>
        <p className="mb-8 text-[var(--color-text-secondary)]">
          {t('error.description')}
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-[var(--color-accent-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-strong)]"
          >
            {t('error.retry')}
          </button>
          <Link
            href="/"
            className="rounded-md border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            {t('error.backToHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
