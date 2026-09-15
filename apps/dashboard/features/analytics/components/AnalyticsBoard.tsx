'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { toRelativeLabel } from '@/features/editorial-shared/lib/schedule';
import {
  countOpenPlanning,
  countOverduePlanning,
  listAnalyticsCategories,
  listAnalyticsReviewArticles,
  listAnalyticsReviewOpinions,
} from '../services/analyticsService';

interface CategoryItem {
  id: string;
  slug: string;
  label: string;
  articleCount: number;
}

interface QueueRow {
  id: string;
  title: string;
  updatedAt?: string;
}

async function totalOf(promise: Promise<Response>, label: string): Promise<number> {
  const res = await promise;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${label}`);
  const json = (await res.json()) as { meta: { total: number } };
  return json.meta.total;
}

export function AnalyticsBoard() {
  const t = useTranslations('analytics');
  const tc = useTranslations('common');
  const { apiFetch, user, ready } = useAuth();
  const { locale } = useDashboardLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [reviewAge, setReviewAge] = useState<QueueRow[]>([]);
  const [openPlanning, setOpenPlanning] = useState(0);
  const [overduePlanning, setOverduePlanning] = useState(0);

  const isReviewer = user?.role === 'reviewer';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catsRes, artQueue, opQueue, open, overdue] = await Promise.all([
        listAnalyticsCategories(apiFetch),
        listAnalyticsReviewArticles(apiFetch),
        listAnalyticsReviewOpinions(apiFetch),
        totalOf(countOpenPlanning(apiFetch), '/planning?limit=1'),
        totalOf(countOverduePlanning(apiFetch), '/planning?limit=1&overdue=true'),
      ]);
      if (!catsRes.ok) throw new Error(`HTTP ${catsRes.status} for categories`);
      if (!artQueue.ok || !opQueue.ok) throw new Error(`HTTP ${artQueue.status}/${opQueue.status} for queue`);
      const catsJson = (await catsRes.json()) as { data: CategoryItem[] };
      const artJson = (await artQueue.json()) as { data: QueueRow[] };
      const opJson = (await opQueue.json()) as { data: QueueRow[] };
      setCategories(catsJson.data);
      setReviewAge([...artJson.data, ...opJson.data].slice(0, 10));
      setOpenPlanning(open);
      setOverduePlanning(overdue);
    } catch (err) {
      const message = err instanceof Error ? err.message : tc('networkError');
      setError(message.includes('401') ? tc('sessionRequired') : message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (ready && isReviewer) {
    return (
      <main>
        <p role="alert">{tc('insufficientRole')}</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main>
        <h1>{t('title')}</h1>
        <Skeleton lines={6} />
      </main>
    );
  }

  if (error) return <main><ErrorState message={error} onRetry={() => void load()} /></main>;

  const maxCount = Math.max(1, ...categories.map((c) => c.articleCount));

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>

      <section className="nh-card" aria-label={t('byCategory')}>
        <h2>{t('byCategory')}</h2>
        {categories.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <div aria-hidden="true">
              {categories.slice(0, 12).map((cat) => (
                <div key={cat.id} className="nh-row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                  <span className="nh-muted" style={{ minWidth: 120 }}>{cat.label}</span>
                  <span className="nh-bar" style={{ width: `${Math.max(Math.round((cat.articleCount / maxCount) * 100), 2)}%` }} />
                  <span className="nh-muted">{cat.articleCount}</span>
                </div>
              ))}
            </div>
            <table className="nh-sr-only">
              <caption>{t('byCategory')}</caption>
              <thead>
                <tr>
                  <th>{t('colCategory')}</th>
                  <th>{t('colCount')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.slice(0, 12).map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.label}</td>
                    <td>{cat.articleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <div className="nh-grid-2">
        <section className="nh-card" aria-label={t('reviewAge')}>
          <h2>{t('reviewAge')}</h2>
          {reviewAge.length === 0 ? (
            <EmptyState message={t('empty')} />
          ) : (
            <ul>
              {reviewAge.map((item) => (
                <li key={item.id}>
                  {item.title}{' '}
                  <span className="nh-muted">
                    {item.updatedAt ? `(${t('colAge')}: ${toRelativeLabel(item.updatedAt, locale)})` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="nh-card" aria-label={t('planning')}>
          <h2>{t('planning')}</h2>
          <p className="nh-muted">{t('openItems', { count: openPlanning })}</p>
          <p className="nh-muted">{t('overdueItems', { count: overduePlanning })}</p>
        </section>
      </div>
    </main>
  );
}
