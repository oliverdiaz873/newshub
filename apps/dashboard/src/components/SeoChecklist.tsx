'use client';

import { useTranslations } from 'next-intl';
import { toLocalLabel } from '@/lib/schedule';

export interface SeoSignals {
  esTitle: string;
  esSummary: string;
  coverMediaId: string | null;
  /** Alt text is not managed by the dashboard editors; null renders neutral. */
  coverAlt?: string | null;
  hasEn: boolean;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  scheduledAt?: string | null;
}

export function seoScore(signals: SeoSignals): { score: number; rows: Array<{ key: string; ok: boolean; neutral?: boolean }> } {
  const rows = [
    { key: 'seoEsTitle', ok: signals.esTitle.trim().length > 0 },
    { key: 'seoEsSummary', ok: signals.esSummary.trim().length > 0 },
    { key: 'seoCover', ok: !!signals.coverMediaId },
    { key: 'seoCoverAlt', ok: !!signals.coverAlt?.trim(), neutral: signals.coverAlt === undefined },
    { key: 'seoEn', ok: signals.hasEn },
  ];
  const weights = [25, 25, 20, 10, 20];
  const score = rows.reduce((sum, row, index) => sum + (row.ok ? (weights[index] ?? 0) : 0), 0);
  return { score, rows };
}

/**
 * SEO completeness meter (Increment 9, Tier 1/UI-only). Informational only:
 * never blocks saving or publishing. Weights are ES-first and fixed.
 */
export function SeoChecklist({ signals }: { signals: SeoSignals }) {
  const t = useTranslations('articles');
  const { score, rows } = seoScore(signals);
  const titleLen = signals.esTitle.trim().length;
  const summaryLen = signals.esSummary.trim().length;

  return (
    <section className="nh-card" aria-label={t('seoTitle')}>
      <h2>{t('seoTitle')}</h2>
      <p className="nh-muted" role="status">
        {t('seoScore', { score })}
      </p>
      <div aria-hidden="true">
        <span className="nh-bar" style={{ width: `${Math.max(score, 2)}%` }} />
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <span aria-hidden="true">{row.ok ? '✓' : row.neutral ? '–' : '!'}</span>{' '}
            {t(row.key as never) as string}
            {row.key === 'seoEsTitle' && titleLen > 0 && (
              <span className="nh-muted"> ({t('seoChars', { count: titleLen, recommended: 60 })})</span>
            )}
            {row.key === 'seoEsSummary' && summaryLen > 0 && (
              <span className="nh-muted"> ({t('seoChars', { count: summaryLen, recommended: 160 })})</span>
            )}
            {row.key === 'seoCoverAlt' && row.neutral && (
              <span className="nh-muted"> ({t('seoAltNote')})</span>
            )}
            <span className="nh-sr-only">{row.ok ? t('seoOk') : t('seoMissing')}</span>
          </li>
        ))}
      </ul>
      {(signals.firstPublishedAt || signals.updatedAt || signals.scheduledAt) && (
        <p className="nh-muted">
          {signals.firstPublishedAt && <span>{t('seoFirstPublished', { date: toLocalLabel(signals.firstPublishedAt) })} </span>}
          {signals.updatedAt && <span>{t('seoLastUpdated', { date: toLocalLabel(signals.updatedAt) })} </span>}
          {signals.scheduledAt && <span>{t('seoScheduled', { date: toLocalLabel(signals.scheduledAt) })}</span>}
        </p>
      )}
    </section>
  );
}
