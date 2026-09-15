'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toasts';
import { useDashboardLocale } from '@/lib/i18n';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RequireAuth } from '@/components/RequireAuth';
import { ConfirmDialog } from '@/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/States';
import { Table } from '@/components/Table';
import { isOverdue, toLocalLabel, toRelativeLabel, toUtcLabel } from '@/lib/schedule';

interface ScheduledItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  updatedAt?: string;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
}

function ScheduledBody() {
  const t = useTranslations('scheduling');
  const ta = useTranslations('articles');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const { notify } = useToast();
  const { locale } = useDashboardLocale();
  const now = useNow(30_000);

  const [articles, setArticles] = useState<ScheduledItem[]>([]);
  const [opinions, setOpinions] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'article' | 'opinion'; action: 'cancel' | 'publish'; item: ScheduledItem } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [arts, ops] = await Promise.all([
        apiFetch('/editorial/articles?scheduled=true&limit=50&locale=es'),
        apiFetch('/editorial/opinions?scheduled=true&limit=50&locale=es'),
      ]);
      if (arts.status === 401 || ops.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!arts.ok || !ops.ok) throw new Error(`HTTP ${arts.status}/${ops.status}`);
      setArticles(((await arts.json()) as { data: ScheduledItem[] }).data);
      setOpinions(((await ops.json()) as { data: ScheduledItem[] }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    // Initial scheduled fetch (single parallel load by design).
    void load();
  }, [load]);

  async function cancel(item: ScheduledItem, kind: 'article' | 'opinion') {
    const base = kind === 'opinion' ? '/opinions' : '/articles';
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${item.id}/schedule`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('clearedOk'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function publishNow(item: ScheduledItem, kind: 'article' | 'opinion') {
    const base = kind === 'opinion' ? '/opinions' : '/articles';
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${item.id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(body?.code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`, 'err');
        return;
      }
      notify(ta('publishedOk'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  function section(kind: 'article' | 'opinion', items: ScheduledItem[], editBase: string) {
    const overdue = items.filter((item) => item.scheduledAt && isOverdue(item.scheduledAt, now));
    const upcoming = items.filter((item) => !item.scheduledAt || !isOverdue(item.scheduledAt, now));
    const ordered = [...overdue, ...upcoming];
    return (
      <section className="nh-card" aria-label={kind === 'article' ? t('articles') : t('opinions')}>
        <h2>{kind === 'article' ? t('articles') : t('opinions')}</h2>
        {ordered.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <Table label={kind === 'article' ? t('articles') : t('opinions')}>
            <thead>
              <tr>
                <th>{ta('colTitle')}</th>
                <th>{t('setTitle')}</th>
                <th>{ta('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((item) => {
                const due = item.scheduledAt ? isOverdue(item.scheduledAt, now) : false;
                return (
                  <tr key={item.id} data-row={item.id} data-status={item.status}>
                    <td>
                      <Link href={`${editBase}/${item.id}`}>{item.title}</Link>
                      <div className="nh-muted">{item.slug}</div>
                    </td>
                    <td>
                      {item.scheduledAt ? (
                        <span className="nh-muted" title={toUtcLabel(item.scheduledAt)}>
                          {due ? t('overdue') : toRelativeLabel(item.scheduledAt, locale, now)} ·{' '}
                          {toLocalLabel(item.scheduledAt)}
                        </span>
                      ) : (
                        <span className="nh-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="nh-row">
                        <button
                          className="nh-btn"
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirm({ kind, action: 'publish', item })}
                        >
                          {t('publishNow')}
                        </button>
                        <button
                          className="nh-btn"
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirm({ kind, action: 'cancel', item })}
                        >
                          {t('clear')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>
    );
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {loading ? (
        <Skeleton lines={6} />
      ) : (
        <>
          {section('article', articles, '/articles')}
          {section('opinion', opinions, '/opinions')}
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'publish' ? t('preemptTitle') : t('clearTitle')}
          message={confirm.action === 'publish' ? t('preemptMessage') : t('clearMessage')}
          confirmLabel={confirm.action === 'publish' ? t('publishNow') : t('clear')}
          onConfirm={() => {
            const { kind, action, item } = confirm;
            setConfirm(null);
            if (action === 'publish') void publishNow(item, kind);
            else void cancel(item, kind);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}

export default function ScheduledPage() {
  return (
    <RequireAuth>
      <ScheduledBody />
    </RequireAuth>
  );
}
