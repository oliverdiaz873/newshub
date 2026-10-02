'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { Modal } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Paginator, Table } from '@/shared/components/Table';
import { listAuditLog } from '../services/auditService';

interface AuditRow {
  id: string;
  at: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  actor: { id: string; email: string; displayName: string } | null;
}

const ACTIONS = [
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
  'archive',
  'restore',
  'reject',
  'schedule.set',
  'schedule.clear',
  'revision.restore',
  'login',
  'logout',
  'login.failed',
  'media.upload',
  'media.delete',
  'media.delete_blocked',
  'assign',
  'start',
  'submit',
  'complete',
  'cancel',
  'reopen',
  'notify.due-soon',
  'notify.overdue',
  'webhook.subscribe',
  'webhook.update',
  'webhook.rotate',
  'webhook.unsubscribe',
  'webhook.ping',
];

const ENTITY_TYPES = ['article', 'opinion', 'media', 'user', 'planning', 'webhook'];

export function AuditBoard() {
  const t = useTranslations('audit');
  const tc = useTranslations('common');
  // Translated filter labels keyed by code (flat keys: dots/dashes are
  // invalid in message keys). Raw codes stay the option values and the
  // fallback so an unmapped code is still selectable and visible.
  const actionLabels: Record<string, string> = {
    create: t('action_create'),
    update: t('action_update'),
    delete: t('action_delete'),
    publish: t('action_publish'),
    unpublish: t('action_unpublish'),
    archive: t('action_archive'),
    restore: t('action_restore'),
    reject: t('action_reject'),
    'schedule.set': t('action_schedule_set'),
    'schedule.clear': t('action_schedule_clear'),
    'revision.restore': t('action_revision_restore'),
    login: t('action_login'),
    logout: t('action_logout'),
    'login.failed': t('action_login_failed'),
    'media.upload': t('action_media_upload'),
    'media.delete': t('action_media_delete'),
    'media.delete_blocked': t('action_media_delete_blocked'),
    assign: t('action_assign'),
    start: t('action_start'),
    submit: t('action_submit'),
    complete: t('action_complete'),
    cancel: t('action_cancel'),
    reopen: t('action_reopen'),
    'notify.due-soon': t('action_notify_due_soon'),
    'notify.overdue': t('action_notify_overdue'),
    'webhook.subscribe': t('action_webhook_subscribe'),
    'webhook.update': t('action_webhook_update'),
    'webhook.rotate': t('action_webhook_rotate'),
    'webhook.unsubscribe': t('action_webhook_unsubscribe'),
    'webhook.ping': t('action_webhook_ping'),
  };
  const entityTypeLabels: Record<string, string> = {
    article: t('type_article'),
    opinion: t('type_opinion'),
    media: t('type_media'),
    user: t('type_user'),
    planning: t('type_planning'),
    webhook: t('type_webhook'),
  };
  const searchParams = useSearchParams();
  const { apiFetch } = useAuth();

  const [action, setAction] = useState(() => searchParams.get('action') ?? '');
  const [entityType, setEntityType] = useState(() => searchParams.get('entityType') ?? '');
  const [entityId, setEntityId] = useState(() => searchParams.get('entityId') ?? '');
  const [actorId, setActorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (entityId.trim()) params.set('entityId', entityId.trim());
      if (actorId.trim()) params.set('actorId', actorId.trim());
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      const res = await listAuditLog(apiFetch, params);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: AuditRow[]; meta: { total: number; totalPages: number } };
      setItems(json.data);
      setTotal(json.meta.total);
      setTotalPages(json.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, entityType, entityId, actorId, from, to]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function apply() {
    setPage(1);
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>

      <section className="nh-card" aria-label={t('title')}>
        <div className="nh-row">
          <label>
            {t('action')}{' '}
            <select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">{t('allActions')}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {actionLabels[a] ?? a}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('entityType')}{' '}
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">{t('allTypes')}</option>
              {ENTITY_TYPES.map((e) => (
                <option key={e} value={e}>
                  {entityTypeLabels[e] ?? e}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('entityId')}{' '}
            <input type="text" value={entityId} onChange={(event) => setEntityId(event.target.value)} />
          </label>
          <label>
            {t('actorId')}{' '}
            <input type="text" value={actorId} onChange={(event) => setActorId(event.target.value)} />
          </label>
          <label>
            {t('from')}{' '}
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            {t('to')}{' '}
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <button className="nh-btn primary" type="button" onClick={apply}>
            {t('action')}
          </button>
        </div>
      </section>

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
                <th>{t('colWhen')}</th>
                <th>{t('colActor')}</th>
                <th>{t('colAction')}</th>
                <th>{t('colEntity')}</th>
                <th>{t('colDetail')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="nh-muted">{new Date(row.at).toLocaleString()}</td>
                  <td>{row.actor ? row.actor.displayName : row.actorId ?? t('system')}</td>
                  <td>{row.action}</td>
                  <td className="nh-muted">
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                  </td>
                  <td>
                    <button className="nh-btn" type="button" onClick={() => setDetail(row)}>
                      {t('colDetail')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator page={page} totalPages={totalPages} total={total} limit={20} onPage={setPage} />
        </>
      )}

      {detail && (
        <Modal title={t('details')} onClose={() => setDetail(null)}>
          <dl>
            <dt className="nh-muted">{t('colWhen')}</dt>
            <dd>{new Date(detail.at).toLocaleString()}</dd>
            <dt className="nh-muted">{t('colActor')}</dt>
            <dd>{detail.actor ? `${detail.actor.displayName} (${detail.actor.email})` : (detail.actorId ?? t('system'))}</dd>
            <dt className="nh-muted">{t('colAction')}</dt>
            <dd>{detail.action}</dd>
            <dt className="nh-muted">{t('colEntity')}</dt>
            <dd>
              {detail.entityType}
              {detail.entityId ? ` · ${detail.entityId}` : ''}
            </dd>
          </dl>
          <pre className="nh-muted">{JSON.stringify(detail.metadata ?? {}, null, 2)}</pre>
        </Modal>
      )}
    </main>
  );
}
