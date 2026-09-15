'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { toRelativeLabel } from '@/features/editorial-shared/lib/schedule';

interface MetaResponse {
  data: unknown[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface QueueItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt?: string;
  kind: 'article' | 'opinion' | 'planning';
}

interface PublishedRow {
  id: string;
  title: string;
  firstPublishedAt: string | null;
  fallback?: boolean;
}

interface WeekBucket {
  key: string;
  label: string;
  articles: number;
  opinions: number;
}

function bucketizeWeeks(rows: Array<{ firstPublishedAt: string | null }>, kinds: Array<'article' | 'opinion'>, weeks = 8, now = Date.now()): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (weeks - 1) * 7);
  for (let i = 0; i < weeks; i++) {
    const start = new Date(monday);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }),
      articles: 0,
      opinions: 0,
    });
  }
  rows.forEach((row, index) => {
    if (!row.firstPublishedAt) return;
    const t = new Date(row.firstPublishedAt).getTime();
    const kind = kinds[index];
    for (const bucket of buckets) {
      const start = new Date(`${bucket.key}T00:00:00`).getTime();
      if (t >= start && t < start + 7 * 24 * 3600_000 && kind) {
        if (kind === 'article') bucket.articles += 1;
        else bucket.opinions += 1;
        break;
      }
    }
  });
  return buckets;
}

interface CategoryItem {
  id: string;
  slug: string;
  label: string;
  articleCount: number;
}

async function totalFor(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  path: string,
): Promise<number> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const json = (await res.json()) as MetaResponse;
  return json.meta.total;
}

function OverviewBody() {
  const t = useTranslations('overview');
  const ta = useTranslations('articles');
  const tc = useTranslations('common');
  const { apiFetch, user } = useAuth();
  const isReviewer = user?.role === 'reviewer';
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ drafts: 0, published: 0, featured: 0, breaking: 0, review: 0 });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [locale, setLocale] = useState({ es: 0, en: 0 });
  const [weeks, setWeeks] = useState<WeekBucket[]>([]);
  const [donut, setDonut] = useState({ esOnly: 0, esEn: 0 });
  const [topCapped, setTopCapped] = useState(false);
  const { locale: dashLocale } = useDashboardLocale();
  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [drafts, review, published, featured, breaking, opinionsReview, opinionsPublished, esTotal, enTotal, queueRes, opinionsQueueRes, planningQueueRes, catsRes, articlesPubRes, opinionsPubRes] =
        await Promise.all([
          totalFor(apiFetch, '/editorial/articles?limit=1&status=draft'),
          totalFor(apiFetch, '/editorial/articles?limit=1&status=review'),
          totalFor(apiFetch, '/editorial/articles?limit=1&status=published'),
          totalFor(apiFetch, '/editorial/articles?limit=1&featured=true'),
          totalFor(apiFetch, '/editorial/articles?limit=1&breaking=true'),
          totalFor(apiFetch, '/editorial/opinions?limit=1&status=review'),
          totalFor(apiFetch, '/editorial/opinions?limit=1&status=published'),
          totalFor(apiFetch, '/editorial/articles?limit=1&locale=es'),
          totalFor(apiFetch, '/editorial/articles?limit=1&locale=en'),
          apiFetch('/editorial/articles?limit=5&status=review'),
          apiFetch('/editorial/opinions?limit=5&status=review'),
          apiFetch('/planning/review-queue'),
          apiFetch('/editorial/categories?limit=20&locale=es'),
          apiFetch('/editorial/articles?limit=100&status=published&locale=en'),
          apiFetch('/editorial/opinions?limit=100&status=published&locale=en'),
        ]);
      if (!queueRes.ok) throw new Error(`HTTP ${queueRes.status} for review queue`);
      if (!opinionsQueueRes.ok) throw new Error(`HTTP ${opinionsQueueRes.status} for opinions queue`);
      if (!catsRes.ok) throw new Error(`HTTP ${catsRes.status} for categories`);
      const queueJson = (await queueRes.json()) as { data: QueueItem[] };
      const opinionsQueueJson = (await opinionsQueueRes.json()) as { data: QueueItem[] };
      const catsJson = (await catsRes.json()) as { data: CategoryItem[] };
      // Tier 1 aggregates (top-100 recent published per surface).
      setTopCapped(published + opinionsPublished > 200);
      if (articlesPubRes.ok && opinionsPubRes.ok) {
        const aJson = (await articlesPubRes.json()) as { data: PublishedRow[] };
        const oJson = (await opinionsPubRes.json()) as { data: PublishedRow[] };
        setWeeks(bucketizeWeeks([...aJson.data, ...oJson.data], [...aJson.data.map(() => 'article' as const), ...oJson.data.map(() => 'opinion' as const)]));
        const esOnly = [...aJson.data, ...oJson.data].filter((r) => r.fallback).length;
        const total = aJson.data.length + oJson.data.length;
        setDonut({ esOnly, esEn: total - esOnly });
      }
      // Planning queue is best-effort: a failure never breaks the overview.
      let planningItems: QueueItem[] = [];
      if (planningQueueRes.ok) {
        const planningJson = (await planningQueueRes.json().catch(() => null)) as {
          data?: Array<{ id: string; title: string; status: string; updatedAt?: string }>;
        } | Array<{ id: string; title: string; status: string; updatedAt?: string }> | null;
        const rows = Array.isArray(planningJson) ? planningJson : (planningJson?.data ?? []);
        planningItems = rows.map((item) => ({ id: item.id, slug: '', title: item.title, status: item.status, updatedAt: item.updatedAt, kind: 'planning' as const }));
      }
      setCounts({ drafts, published, featured, breaking, review: review + opinionsReview });
      const merged: QueueItem[] = [
        ...queueJson.data.map((item) => ({ ...item, kind: 'article' as const })),
        ...opinionsQueueJson.data.map((item) => ({ ...item, kind: 'opinion' as const })),
        ...planningItems,
      ];
      merged.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      setQueue(merged.slice(0, 8));
      setCategories(catsJson.data);
      setLocale({ es: esTotal, en: enTotal });
    } catch (err) {
      const message = err instanceof Error ? err.message : tc('networkError');
      setError(message.includes('401') ? tc('sessionRequired') : message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    // Data fetch on mount: loaders call setState by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <main>
        <h1>{t('title')}</h1>
        <Skeleton lines={6} />
      </main>
    );
  }

  if (error) return <main><ErrorState message={error} onRetry={() => void load()} /></main>;

  async function queueAction(item: QueueItem, action: 'publish' | 'reject') {
    setActing(true);
    try {
      const base = item.kind === 'opinion' ? '/opinions' : '/articles';
      const res = await apiFetch(`${base}/${item.id}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(
          body?.code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`,
          'err',
        );
        return;
      }
      notify(action === 'publish' ? ta('publishedOk') : ta('rejectedOk'), 'ok');
      await load(true);
    } finally {
      setActing(false);
    }
  }

  const kpis = [
    { label: t('drafts'), value: counts.drafts, href: '/articles' },
    { label: t('published'), value: counts.published, href: '/articles' },
    { label: t('featured'), value: counts.featured, href: '/articles' },
    { label: t('breaking'), value: counts.breaking, href: '/articles' },
  ];

  return (
    <main>
      <Breadcrumbs trail={[{ label: 'Home' }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>
      <p>
        <span className="nh-badge" title={t('tier1hint')}>
          {t('tier1badge')}
        </span>
      </p>

      <div className="nh-kpis">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="nh-kpi" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="nh-muted">{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </Link>
        ))}
      </div>

      <section className="nh-card" aria-label={t('weeklyTitle')}>
        <h2>{t('weeklyTitle')}</h2>
        {topCapped && <p className="nh-muted">{t('topNote')}</p>}
        {weeks.length === 0 || weeks.every((w) => w.articles + w.opinions === 0) ? (
          <EmptyState message={t('weeklyEmpty')} />
        ) : (
          <>
            <div aria-hidden="true">
              {weeks.map((week) => {
                const max = Math.max(1, ...weeks.map((w) => w.articles + w.opinions));
                const pct = Math.round(((week.articles + week.opinions) / max) * 100);
                return (
                  <div key={week.key} className="nh-row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                    <span className="nh-muted" style={{ minWidth: 48 }}>{week.label}</span>
                    <span className="nh-bar" style={{ width: `${Math.max(pct, 2)}%` }} />
                    <span className="nh-muted">{week.articles + week.opinions}</span>
                  </div>
                );
              })}
            </div>
            <table className="nh-sr-only">
              <caption>{t('weeklyTitle')}</caption>
              <thead>
                <tr>
                  <th>{t('weekCol')}</th>
                  <th>{t('articlesCol')}</th>
                  <th>{t('opinionsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week.key}>
                    <td>{week.label}</td>
                    <td>{week.articles}</td>
                    <td>{week.opinions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <div className="nh-grid-2">
        <section className="nh-card" aria-label={t('reviewQueue')}>
          <h2>{t('reviewQueue')}</h2>
          {queue.length === 0 ? (
            <EmptyState message={t('emptyQueue')} />
          ) : (
            <ul>
              {queue.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={
                      item.kind === 'opinion'
                        ? `/opinions/${item.id}`
                        : item.kind === 'planning'
                          ? '/planning'
                          : `/articles/${item.id}`
                    }
                  >
                    {item.title}
                  </Link>{' '}
                  <span className="nh-muted">
                    ({item.kind === 'planning' ? item.status : `${item.slug} · ${item.kind}`}
                    {item.updatedAt ? ` · ${toRelativeLabel(item.updatedAt, dashLocale)}` : ''})
                  </span>{' '}
                  {item.kind !== 'planning' && !isReviewer && (
                    <>
                      <button
                        className="nh-btn"
                        type="button"
                        disabled={acting}
                        onClick={() => void queueAction(item, 'publish')}
                      >
                        {ta('actionPublish')}
                      </button>{' '}
                      <button
                        className="nh-btn"
                        type="button"
                        disabled={acting}
                        onClick={() => setRejectTarget(item)}
                      >
                        {ta('actionReject')}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="nh-card" aria-label={t('localeCoverage')}>
          <h2>{t('localeCoverage')}</h2>
          <p className="nh-muted">
            ES: {locale.es} · EN: {locale.en}
          </p>
          {(donut.esOnly + donut.esEn) > 0 && (
            <>
              <div
                aria-hidden="true"
                className="nh-donut"
                style={{
                  background: `conic-gradient(var(--accent, #1d4ed8) 0 ${(donut.esEn / (donut.esOnly + donut.esEn)) * 100}%, var(--surface-2) 0 100%)`,
                }}
              />
              <ul className="nh-sr-only">
                <li>{t('esOnly', { count: donut.esOnly })}</li>
                <li>{t('esEn', { count: donut.esEn })}</li>
              </ul>
              <p className="nh-muted" aria-hidden="true">
                {t('esOnly', { count: donut.esOnly })} · {t('esEn', { count: donut.esEn })}
              </p>
            </>
          )}
          <p className="nh-muted">{t('pendingEvents')}</p>
        </section>
      </div>

      <section className="nh-card" aria-label={t('activity')}>
        <h2>{t('activity')}</h2>
        {categories.length === 0 ? (
          <EmptyState />
        ) : (
          <ul>
            {categories.slice(0, 8).map((cat) => (
              <li key={cat.id}>
                {cat.label} ({cat.slug}): {cat.articleCount}
              </li>
            ))}
          </ul>
        )}
      </section>

      {rejectTarget && (
        <ConfirmDialog
          title={ta('rejectTitle')}
          message={ta('rejectMessage', { title: rejectTarget.title })}
          confirmLabel={ta('actionReject')}
          onConfirm={() => {
            const item = rejectTarget;
            setRejectTarget(null);
            void queueAction(item, 'reject');
          }}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </main>
  );
}

export default function Home() {
  return (
    <RequireAuth>
      <OverviewBody />
    </RequireAuth>
  );
}
