'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useDashboardLocale } from '@/shared/lib/i18n';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Paginator, Table } from '@/shared/components/Table';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { PlanningForm } from '@/components/PlanningForm';
import { planningActionsFor, type PlanningAction, type PlanningItem } from '@/lib/planning';
import { toLocalLabel } from '@/features/editorial-shared/lib/schedule';

interface ScheduledEntry {
  kind: 'article' | 'opinion';
  id: string;
  title: string;
  slug: string;
  scheduledAt: string | null;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

const STATUS_KEYS = {
  pitched: 'statusPitched',
  assigned: 'statusAssigned',
  'in-progress': 'statusInProgress',
  'in-review': 'statusInReview',
  done: 'statusDone',
  cancelled: 'statusCancelled',
} as const;

const ACTION_KEYS = {
  assign: 'actionAssign',
  start: 'actionStart',
  submit: 'actionSubmit',
  complete: 'actionComplete',
  cancel: 'actionCancel',
  reopen: 'actionReopen',
} as const;

function PlanningBody() {
  const t = useTranslations('planning');
  const tc = useTranslations('common');
  const { apiFetch, user } = useAuth();
  const { locale: dashLocale } = useDashboardLocale();
  const { notify } = useToast();
  const isReviewer = user?.role === 'reviewer';
  const canEdit = !isReviewer;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlanningItem | null>(null);
  const [deleting, setDeleting] = useState<PlanningItem | null>(null);
  const [busy, setBusy] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calItems, setCalItems] = useState<PlanningItem[]>([]);
  const [calScheduled, setCalScheduled] = useState<ScheduledEntry[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (overdueOnly) params.set('overdue', 'true');
      if (query.trim()) params.set('q', query.trim());
      const res = await apiFetch(`/planning?${params.toString()}`);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!res.ok) {
        setError(tc('httpError', { status: res.status }));
        return;
      }
      const body = (await res.json()) as {
        data: PlanningItem[];
        meta: { total: number; totalPages: number };
      };
      setItems(body.data);
      setTotal(body.meta.total);
      setTotalPages(body.meta.totalPages);
    } catch {
      setError(tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, statusFilter, typeFilter, overdueOnly, query, tc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, reloadToken]);

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const { from, to } = monthRange(calYear, calMonth);
      const res = await apiFetch(`/planning/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { items: PlanningItem[]; scheduled: ScheduledEntry[] };
      setCalItems(body.items);
      setCalScheduled(body.scheduled);
    } finally {
      setCalLoading(false);
    }
  }, [apiFetch, calYear, calMonth]);

  useEffect(() => {
    if (view !== 'calendar') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCalendar();
  }, [view, loadCalendar]);

  async function runAction(item: PlanningItem, action: PlanningAction, assigneeId?: string) {
    setBusy(true);
    try {
      const res = await apiFetch(`/planning/${item.id}/${action}`, {
        method: 'POST',
        ...(action === 'assign' ? { body: JSON.stringify({ assigneeId }) } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(body?.code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('transitionOk'), 'ok');
      setReloadToken((token) => token + 1);
      if (view === 'calendar') void loadCalendar();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/planning/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('deleted'), 'ok');
      setDeleting(null);
      setReloadToken((token) => token + 1);
    } finally {
      setBusy(false);
    }
  }

  const days = useMemo(() => {
    const first = new Date(calYear, calMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(calYear, calMonth, 1 - startOffset + i);
      cells.push({ date, inMonth: date.getMonth() === calMonth });
      if (i >= 28 && date.getMonth() !== calMonth && date.getDay() === 1) break;
    }
    return cells;
  }, [calYear, calMonth]);

  const byDay = useMemo(() => {
    const map = new Map<string, { items: PlanningItem[]; scheduled: ScheduledEntry[] }>();
    const put = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { items: [], scheduled: [] };
        map.set(key, entry);
      }
      return entry;
    };
    for (const item of calItems) {
      if (item.dueAt) put(dayKey(item.dueAt)).items.push(item);
    }
    for (const s of calScheduled) {
      if (s.scheduledAt) put(dayKey(s.scheduledAt)).scheduled.push(s);
    }
    return map;
  }, [calItems, calScheduled]);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString(dashLocale, { month: 'long', year: 'numeric' });

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <div className="nh-row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('title')}</h1>
        <div className="nh-row">
          <button
            className={view === 'list' ? 'nh-btn primary' : 'nh-btn'}
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            {t('viewList')}
          </button>
          <button
            className={view === 'calendar' ? 'nh-btn primary' : 'nh-btn'}
            type="button"
            aria-pressed={view === 'calendar'}
            onClick={() => setView('calendar')}
          >
            {t('viewCalendar')}
          </button>
          {canEdit && (
            <button
              className="nh-btn primary"
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t('new')}
            </button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <>
          <section className="nh-card" aria-label={t('searchLabel')}>
            <div className="nh-row">
              <label>
                {t('status')}{' '}
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">{t('allStatuses')}</option>
                  <option value="pitched">{t('statusPitched')}</option>
                  <option value="assigned">{t('statusAssigned')}</option>
                  <option value="in-progress">{t('statusInProgress')}</option>
                  <option value="in-review">{t('statusInReview')}</option>
                  <option value="done">{t('statusDone')}</option>
                  <option value="cancelled">{t('statusCancelled')}</option>
                </select>
              </label>
              <label>
                {t('type')}{' '}
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">{t('allTypes')}</option>
                  <option value="pitch">{t('typePitch')}</option>
                  <option value="assignment">{t('typeAssignment')}</option>
                </select>
              </label>
              <label>
                <input type="checkbox" checked={overdueOnly} onChange={(event) => { setOverdueOnly(event.target.checked); setPage(1); }} />{' '}
                {t('overdueOnly')}
              </label>
              <label htmlFor="planning-q">
                {t('searchLabel')}{' '}
                <input
                  id="planning-q"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
          </section>

          {error && <ErrorState message={error} onRetry={() => setReloadToken((token) => token + 1)} />}

          {loading ? (
            <Skeleton lines={6} />
          ) : items.length === 0 ? (
            <EmptyState message={t('empty')} />
          ) : (
            <>
              <Table label={t('title')}>
                <thead>
                  <tr>
                    <th>{t('colTitle')}</th>
                    <th>{t('colType')}</th>
                    <th>{t('colStatus')}</th>
                    <th>{t('colAssignee')}</th>
                    <th>{t('colDue')}</th>
                    <th>{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} data-status={item.status}>
                      <td>
                        {item.title}
                        {item.overdue && <div className="nh-muted">{t('overdueBadge')}</div>}
                        <div className="nh-muted">{item.priority}</div>
                      </td>
                      <td>{item.type === 'pitch' ? t('typePitch') : t('typeAssignment')}</td>
                      <td>{t(STATUS_KEYS[item.status] as never) as string}</td>
                      <td>{item.assignee?.displayName ?? t('unassigned')}</td>
                      <td className="nh-muted">{item.dueAt ? toLocalLabel(item.dueAt) : '—'}</td>
                      <td>
                        <div className="nh-row">
                          {planningActionsFor(item.status)
                            .filter((a) => canEdit || a === 'complete')
                            .filter((a) => a !== 'assign' || item.assigneeId)
                            .map((action) => (
                              <button
                                key={action}
                                className="nh-btn"
                                type="button"
                                disabled={busy}
                                onClick={() => void runAction(item, action, item.assigneeId ?? undefined)}
                              >
                                {t(ACTION_KEYS[action] as never) as string}
                              </button>
                            ))}
                          {canEdit && (
                            <>
                              <button
                                className="nh-btn"
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setEditing(item);
                                  setFormOpen(true);
                                }}
                              >
                                {t('actionEdit')}
                              </button>
                              <button className="nh-btn danger" type="button" disabled={busy} onClick={() => setDeleting(item)}>
                                {t('actionDelete')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Paginator page={page} totalPages={totalPages} total={total} limit={20} onPage={setPage} />
            </>
          )}
        </>
      ) : (
        <section className="nh-card" aria-label={t('viewCalendar')}>
          <div className="nh-row" style={{ justifyContent: 'space-between' }}>
            <h2>{monthLabel}</h2>
            <div className="nh-row">
              <button
                className="nh-btn"
                type="button"
                onClick={() => {
                  const prev = new Date(calYear, calMonth - 1, 1);
                  setCalYear(prev.getFullYear());
                  setCalMonth(prev.getMonth());
                }}
              >
                {t('prevMonth')}
              </button>
              <button
                className="nh-btn"
                type="button"
                onClick={() => {
                  setCalYear(now.getFullYear());
                  setCalMonth(now.getMonth());
                }}
              >
                {t('today')}
              </button>
              <button
                className="nh-btn"
                type="button"
                onClick={() => {
                  const next = new Date(calYear, calMonth + 1, 1);
                  setCalYear(next.getFullYear());
                  setCalMonth(next.getMonth());
                }}
              >
                {t('nextMonth')}
              </button>
            </div>
          </div>
          {calLoading ? (
            <Skeleton lines={6} />
          ) : (
            <div className="nh-cal" role="list" aria-label={monthLabel}>
              {days.map(({ date, inMonth }) => {
                const key = date.toISOString().slice(0, 10);
                const entry = byDay.get(key);
                return (
                  <div key={key} role="listitem" aria-label={date.toLocaleDateString(dashLocale, { weekday: 'long', day: 'numeric', month: 'long' })} className={inMonth ? 'nh-cal-day' : 'nh-cal-day outside'}>
                    <strong>{date.getDate()}</strong>
                    {(entry?.items ?? []).map((item) => (
                      <div key={item.id} className={item.overdue ? 'nh-muted nh-overdue' : 'nh-muted'}>
                        {item.title} ({t(STATUS_KEYS[item.status] as never) as string})
                      </div>
                    ))}
                    {(entry?.scheduled ?? []).map((s) => (
                      <div key={`${s.kind}-${s.id}`} className="nh-muted">
                        ⏱ {s.title} ({s.kind})
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {calItems.length === 0 && calScheduled.length === 0 && !calLoading && <EmptyState message={t('emptyCalendar')} />}
        </section>
      )}

      {formOpen && (
        <PlanningForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            setReloadToken((token) => token + 1);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage', { title: deleting.title })}
          confirmLabel={t('actionDelete')}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}

export default function PlanningPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <PlanningBody />
      </Suspense>
    </RequireAuth>
  );
}
