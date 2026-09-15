'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { ConfirmDialog } from '@/shared/components/Modal';
import {
  fromLocalInputValue,
  isOverdue,
  localZoneLabel,
  toLocalInputValue,
  toLocalLabel,
  toRelativeLabel,
  toUtcLabel,
} from '@/features/editorial-shared/lib/schedule';

/**
 * Shared schedule controls (article + opinion editors). Visible only for
 * review items: the API rejects scheduling from any other status with 409.
 * Clearing is idempotent; manual transitions cancel the schedule
 * server-side.
 */
export function ScheduleSection({
  kind,
  id,
  status,
  scheduledAt,
  onChanged,
}: {
  kind: 'article' | 'opinion';
  id: string;
  status: string;
  scheduledAt: string | null;
  onChanged: () => void;
}) {
  const t = useTranslations('scheduling');
  const { apiFetch } = useAuth();
  const { notify } = useToast();
  const { locale } = useDashboardLocale();
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Draft overrides the prop while typing; null means "synced with server".
  const input = draft ?? (scheduledAt ? toLocalInputValue(new Date(scheduledAt)) : '');

  if (status !== 'review') return null;
  const base = kind === 'opinion' ? '/opinions' : '/articles';

  async function set() {
    const iso = fromLocalInputValue(input);
    if (!iso || !(new Date(iso).getTime() > Date.now())) {
      notify(t('pastDate'), 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt: iso }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(body?.code === 'invalid_transition' ? t('reviewOnly') : `HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('scheduledOk'), 'ok');
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${id}/schedule`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      setDraft(null);
      notify(t('clearedOk'), 'ok');
      onChanged();    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="nh-card" aria-label={t('setTitle')}>
      <h2>{t('setTitle')}</h2>
      {scheduledAt && (
        <p className="nh-muted" title={toUtcLabel(scheduledAt)}>
          {isOverdue(scheduledAt)
            ? t('overdue')
            : t('scheduledFor', {
                date: toLocalLabel(scheduledAt),
                relative: toRelativeLabel(scheduledAt, locale),
              })}
        </p>
      )}
      <div className="nh-field">
        <label htmlFor={`schedule-${kind}-${id}`}>{t('pickLabel')}</label>
        <input
          id={`schedule-${kind}-${id}`}
          type="datetime-local"
          value={input}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <span className="nh-muted">{t('zoneNote', { zone: localZoneLabel() })}</span>
      </div>
      <div className="nh-row">
        <button className="nh-btn primary" type="button" disabled={busy || !input} onClick={() => void set()}>
          {t('set')}
        </button>
        {scheduledAt && (
          <button className="nh-btn" type="button" disabled={busy} onClick={() => setConfirmClear(true)}>
            {t('clear')}
          </button>
        )}
      </div>
      {confirmClear && (
        <ConfirmDialog
          title={t('clearTitle')}
          message={t('clearMessage')}
          onConfirm={() => {
            setConfirmClear(false);
            void clear();
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  );
}
