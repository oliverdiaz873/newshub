'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export function Table({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="nh-table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="nh-table">{children}</table>
    </div>
  );
}

export function Paginator({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const t = useTranslations('common');
  const numbers: number[] = [];
  for (let n = Math.max(1, page - 2); n <= Math.min(totalPages, page + 2); n++) numbers.push(n);
  return (
    <div className="nh-paginator">
      <span className="nh-muted">{t('showing', { from, to, total })}</span>
      <div className="nh-row">
        <button className="nh-btn" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('prevPage')}>
          ‹
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            className={n === page ? 'nh-btn primary' : 'nh-btn'}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        <button
          className="nh-btn"
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label={t('nextPage')}
        >
          ›
        </button>
      </div>
    </div>
  );
}
