'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Table } from '@/shared/components/Table';
import { isOverdue, toLocalLabel, toRelativeLabel, toUtcLabel } from '@/features/editorial-shared/lib/schedule';
import { useScheduled, type ScheduledItem, type ScheduledKind } from '../hooks/useScheduled';

export function ScheduledList() {
  const t = useTranslations('scheduling');
  const ta = useTranslations('articles');
  const { locale } = useDashboardLocale();
  const { articles, opinions, loading, error, busy, confirm, setConfirm, load, cancel, publishNow, now } =
    useScheduled();

  function section(kind: ScheduledKind, items: ScheduledItem[], editBase: string) {
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
