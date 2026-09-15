'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export function EmptyState({
  message,
  action,
}: {
  message?: string;
  action?: ReactNode;
}) {
  const t = useTranslations('common');
  return (
    <div className="nh-empty">
      <p className="nh-muted">{message ?? t('empty')}</p>
      {action}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const t = useTranslations('common');
  return (
    <>
      <div className="nh-skeleton" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="nh-skeleton-line" />
        ))}
      </div>
      <span className="nh-sr-only" role="status">
        {t('loading')}
      </span>
    </>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTranslations('common');
  return (
    <div className="nh-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <div className="nh-row" style={{ marginTop: 8 }}>
          <button className="nh-btn" type="button" onClick={onRetry}>
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  );
}
