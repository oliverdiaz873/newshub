'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toasts';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState, ErrorState, Skeleton } from '@/components/States';
import { Paginator, Table } from '@/components/Table';
import { LoadingFallback } from '@/components/LoadingFallback';
import { notificationHref, typeLabelKey, type NotificationItem } from '@/lib/notifications';

function NotificationsBody() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/notifications?page=${page}&limit=20`);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!res.ok) {
        setError(tc('httpError', { status: res.status }));
        return;
      }
      const body = (await res.json()) as {
        data: NotificationItem[];
        meta: { total: number; totalPages: number; unread: number };
      };
      setItems(body.data);
      setTotal(body.meta.total);
      setTotalPages(body.meta.totalPages);
      setUnread(body.meta.unread);
    } catch {
      setError(tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, tc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function markOne(id: string) {
    setBusyId(id);
    try {
      const res = await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      if (!res.ok) {
        notify(tc('httpError', { status: res.status }), 'err');
        return;
      }
      setItems((current) => current.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnread((u) => Math.max(0, u - 1));
      notify(t('markedRead'), 'ok');
    } finally {
      setBusyId(null);
    }
  }

  async function markAll() {
    setBusyAll(true);
    try {
      const res = await apiFetch('/notifications/read-all', { method: 'POST' });
      if (!res.ok) {
        notify(tc('httpError', { status: res.status }), 'err');
        return;
      }
      setItems((current) => current.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnread(0);
      notify(t('markedAllRead'), 'ok');
    } finally {
      setBusyAll(false);
    }
  }

  function titleOf(n: NotificationItem): string {
    const payload = n.payload ?? {};
    const title = typeof payload.title === 'string' ? payload.title : null;
    return title ?? `${n.entityType} ${n.entityId?.slice(0, 8) ?? ''}`;
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <div className="nh-row" style={{ justifyContent: 'space-between' }}>
        <h1>
          {t('title')}{' '}
          {unread > 0 && (
            <span className="nh-badge">
              <span aria-hidden="true">{unread > 99 ? '99+' : unread}</span>
              <span className="nh-sr-only">{t('unreadCount', { count: unread })}</span>
            </span>
          )}
        </h1>
        <button className="nh-btn" type="button" disabled={busyAll || unread === 0} onClick={() => void markAll()}>
          {t('markAllRead')}
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <Skeleton lines={6} />
      ) : items.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <>
          <Table label={t('title')}>
            <thead>
              <tr>
                <th>{t('colType')}</th>
                <th>{t('colItem')}</th>
                <th>{t('colWhen')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => {
                const href = notificationHref(n);
                const isUnread = !n.readAt;
                return (
                  <tr key={n.id} data-unread={isUnread ? 'true' : 'false'} style={isUnread ? { fontWeight: 600 } : undefined}>
                    <td>
                      {t(typeLabelKey(n.type) as never) as string}
                      {typeof n.payload?.reason === 'string' && n.payload.reason ? (
                        <div className="nh-muted">{String(n.payload.reason).slice(0, 140)}</div>
                      ) : null}
                    </td>
                    <td>
                      {href ? <Link href={href}>{titleOf(n)}</Link> : titleOf(n)}
                      <div className="nh-muted">
                        {n.entityType} · {n.actor?.displayName ?? t('system')}
                      </div>
                    </td>
                    <td className="nh-muted">{new Date(n.createdAt).toLocaleString()}</td>
                    <td>
                      {isUnread ? (
                        <button className="nh-btn" type="button" disabled={busyId === n.id} onClick={() => void markOne(n.id)}>
                          {t('markRead')}
                        </button>
                      ) : (
                        <span className="nh-muted">{t('read')}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Paginator page={page} totalPages={totalPages} total={total} limit={20} onPage={setPage} />
        </>
      )}
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <NotificationsBody />
      </Suspense>
    </RequireAuth>
  );
}
