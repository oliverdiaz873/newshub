'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ConfirmDialog, Modal } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Table } from '@/shared/components/Table';
import { toLocalLabel } from '@/features/editorial-shared/lib/schedule';
import type { Delivery, Subscription } from '../types';
import {
  createWebhook,
  listWebhookDeliveries,
  listWebhooks,
  pingWebhook,
  removeWebhook,
  rotateWebhookSecret,
  updateWebhook,
} from '../services/syndicationService';

const EVENT_OPTIONS = ['published', 'unpublished'] as const;

export function SyndicationBoard() {
  const t = useTranslations('syndication');
  const tc = useTranslations('common');
  const { apiFetch, user, ready } = useAuth();
  const { notify } = useToast();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['published', 'unpublished']);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; secret: string } | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWebhooks(apiFetch);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (res.status === 403) {
        setError(tc('insufficientRole'));
        return;
      }
      if (!res.ok) {
        setError(tc('httpError', { status: res.status }));
        return;
      }
      setItems((await res.json()) as Subscription[]);
    } catch {
      setError(tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    if (!ready || !isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, ready, isAdmin]);

  const loadDeliveries = useCallback(
    async (id: string) => {
      setDeliveriesLoading(true);
      try {
        const res = await listWebhookDeliveries(apiFetch, id);
        if (!res.ok) return;
        const body = (await res.json()) as { data: Delivery[] };
        setDeliveries(body.data);
      } finally {
        setDeliveriesLoading(false);
      }
    },
    [apiFetch],
  );

  function select(item: Subscription) {
    setSelected(item);
    void loadDeliveries(item.id);
  }

  async function create() {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await createWebhook(apiFetch, url.trim(), events);
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      const body = (await res.json()) as Subscription & { secret: string };
      setRevealed({ id: body.id, secret: body.secret });
      setUrl('');
      notify(t('created'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: Subscription) {
    setBusy(true);
    try {
      const res = await updateWebhook(apiFetch, item.id, !item.active);
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('saved'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rotate(item: Subscription) {
    setBusy(true);
    try {
      const res = await rotateWebhookSecret(apiFetch, item.id);
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      const body = (await res.json()) as { secret: string };
      setRevealed({ id: item.id, secret: body.secret });
      notify(t('rotated'), 'ok');
    } finally {
      setBusy(false);
    }
  }

  async function ping(item: Subscription) {
    setBusy(true);
    setPingResult(null);
    try {
      const res = await pingWebhook(apiFetch, item.id);
      const body = (await res.json().catch(() => null)) as { ok?: boolean; responseCode?: number } | null;
      if (!res.ok || !body?.ok) {
        setPingResult(t('pingFail'));
        return;
      }
      setPingResult(t('pingOk', { code: body.responseCode ?? 0 }));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await removeWebhook(apiFetch, deleting.id);
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('deleted'), 'ok');
      setDeleting(null);
      if (selected?.id === deleting.id) setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (ready && !isAdmin) {
    return (
      <main>
        <p role="alert">{tc('insufficientRole')}</p>
      </main>
    );
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <div className="nh-row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('title')}</h1>
        <button className="nh-btn primary" type="button" onClick={() => setFormOpen(true)}>
          {t('new')}
        </button>
      </div>
      <p className="nh-muted">{t('subtitle')}</p>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {loading ? (
        <Skeleton lines={4} />
      ) : items.length === 0 && !error ? (
        <EmptyState message={t('empty')} />
      ) : (
        <Table label={t('title')}>
          <thead>
            <tr>
              <th>{t('colUrl')}</th>
              <th>{t('colEvents')}</th>
              <th>{t('colActive')}</th>
              <th>{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.url}</td>
                <td>{item.events.join(', ')}</td>
                <td>{item.active ? t('yes') : t('no')}</td>
                <td>
                  <div className="nh-row">
                    <button className="nh-btn" type="button" disabled={busy} onClick={() => select(item)}>
                      {t('deliveries')}
                    </button>
                    <button className="nh-btn" type="button" disabled={busy} onClick={() => void toggleActive(item)}>
                      {item.active ? t('deactivate') : t('activate')}
                    </button>
                    <button className="nh-btn" type="button" disabled={busy} onClick={() => void rotate(item)}>
                      {t('rotate')}
                    </button>
                    <button className="nh-btn" type="button" disabled={busy} onClick={() => void ping(item)}>
                      {t('ping')}
                    </button>
                    <button className="nh-btn danger" type="button" disabled={busy} onClick={() => setDeleting(item)}>
                      {t('actionDelete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {pingResult && (
        <p className="nh-muted" role="status">
          {pingResult}
        </p>
      )}

      {selected && (
        <section className="nh-card" aria-label={t('deliveriesTitle')}>
          <h2>{t('deliveriesTitle')}</h2>
          <p className="nh-muted">{selected.url}</p>
          {deliveriesLoading ? (
            <Skeleton lines={3} />
          ) : deliveries.length === 0 ? (
            <EmptyState message={t('emptyDeliveries')} />
          ) : (
            <Table label={t('deliveriesTitle')}>
              <thead>
                <tr>
                  <th>{t('colEntity')}</th>
                  <th>{t('colAction')}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('colAttempts')}</th>
                  <th>{t('colWhen')}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="nh-muted">
                      {d.entityType}/{d.entityId.slice(0, 8)}
                    </td>
                    <td>{d.action}</td>
                    <td>
                      {d.status}
                      {d.responseCode ? ` (${d.responseCode})` : ''}
                    </td>
                    <td>{d.attempts}</td>
                    <td className="nh-muted">{toLocalLabel(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      )}

      {formOpen && (
        <Modal title={t('new')} onClose={() => !busy && setFormOpen(false)}>
          <div className="nh-field">
            <label htmlFor="wh-url">{t('fieldUrl')}</label>
            <input id="wh-url" type="url" value={url} disabled={busy} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
          </div>
          <fieldset>
            <legend>{t('fieldEvents')}</legend>
            {EVENT_OPTIONS.map((event) => (
              <label key={event} className="nh-row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={events.includes(event)}
                  disabled={busy}
                  onChange={() => {
                    setEvents((current) =>
                      current.includes(event) ? current.filter((e) => e !== event) : [...current, event],
                    );
                  }}
                />{' '}
                {event}
              </label>
            ))}
          </fieldset>
          <div className="nh-row">
            <button className="nh-btn" type="button" disabled={busy} onClick={() => setFormOpen(false)}>
              {t('cancelAction')}
            </button>
            <button
              className="nh-btn primary"
              type="button"
              disabled={busy || !url.trim()}
              autoFocus
              onClick={() => {
                void create().then(() => setFormOpen(false));
              }}
            >
              {t('create')}
            </button>
          </div>
        </Modal>
      )}

      {revealed && (
        <Modal title={t('secretTitle')} onClose={() => setRevealed(null)}>
          <p className="nh-muted" role="alert">
            {t('secretOnce')}
          </p>
          <p>
            <code>{revealed.secret}</code>
          </p>
          <div className="nh-row">
            <button className="nh-btn primary" type="button" autoFocus onClick={() => setRevealed(null)}>
              {t('secretDone')}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage', { title: deleting.url })}
          confirmLabel={t('actionDelete')}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
