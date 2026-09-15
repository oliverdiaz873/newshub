'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { diffSnapshots, type RevisionSnapshotShape } from '@/lib/revision-diff';

interface RevisionRow {
  id: string;
  version: number;
  cause: string;
  createdAt: string;
  snapshot: RevisionSnapshotShape;
  actor: { id: string; email: string; displayName: string } | null;
}

/**
 * Version history panel (articles + opinions). Lists versions newest-first
 * with actor/when/cause, per-version snapshot view, client-side diff
 * against the previous version, restore-as-new-version with confirm, and
 * a deep link into the audit trail. Snapshots stay the restore source of
 * truth; diffs are display-only.
 */
export function HistoryPanel({
  kind,
  id,
  onRestored,
}: {
  kind: 'article' | 'opinion';
  id: string;
  onRestored: () => void;
}) {
  const t = useTranslations('history');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const { notify } = useToast();
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [diffFor, setDiffFor] = useState<number | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RevisionRow | null>(null);
  const [busy, setBusy] = useState(false);

  const base = kind === 'opinion' ? '/opinions' : '/articles';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${base}/${id}/revisions?limit=50`);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: RevisionRow[] };
      setRows(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, base, id, tc]);

  useEffect(() => {
    // Single history fetch per mount/entity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function restore(row: RevisionRow) {
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${id}/revisions/${row.version}/restore`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(body?.code === 'invalid_transition' ? body.code : `HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('restoredOk'), 'ok');
      setRestoreTarget(null);
      setOpen(null);
      setDiffFor(null);
      await load();
      onRestored();
    } finally {
      setBusy(false);
    }
  }

  function summary(row: RevisionRow): string {
    const es = row.snapshot.translations.find((tr) => tr.locale === 'es');
    return es?.title ?? row.snapshot.translations[0]?.title ?? '—';
  }

  if (loading) return <Skeleton lines={4} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (rows.length === 0) return <EmptyState message={t('empty')} />;

  const byVersion = new Map(rows.map((row) => [row.version, row]));

  return (
    <div>
      <ul>
        {rows.map((row) => {
          const previous = byVersion.get(row.version - 1) ?? null;
          const changes = previous ? diffSnapshots(previous.snapshot, row.snapshot) : [];
          const expanded = open === row.version;
          return (
            <li key={row.id} className="nh-card">
              <div className="nh-row" style={{ justifyContent: 'space-between' }}>
                <strong>{t('version', { version: row.version })}</strong>
                <span className="nh-muted">
                  {row.actor ? row.actor.displayName : 'system'} ·{' '}
                  {new Date(row.createdAt).toLocaleString()} · {row.cause}
                </span>
              </div>
              <p className="nh-muted">{summary(row)}</p>
              <div className="nh-row">
                <button className="nh-btn" type="button" onClick={() => setOpen(expanded ? null : row.version)}>
                  {t('view')}
                </button>
                {previous && (
                  <button
                    className="nh-btn"
                    type="button"
                    onClick={() => setDiffFor(diffFor === row.version ? null : row.version)}
                  >
                    {t('diff')}
                  </button>
                )}
                <button
                  className="nh-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => setRestoreTarget(row)}
                >
                  {t('restore')}
                </button>
                <Link
                  className="nh-btn"
                  href={`/audit-log?entityType=${kind}&entityId=${id}`}
                >
                  {t('trail')}
                </Link>
              </div>
              {expanded && (
                <div>
                  <h3>{t('view')}</h3>
                  {row.snapshot.translations.map((tr) => (
                    <div key={tr.locale} className="nh-field">
                      <span className="nh-muted">{tr.locale}</span>
                      <p>
                        <strong>{tr.title}</strong>
                        <br />
                        <span className="nh-muted">{tr.slug}</span>
                      </p>
                      <p>{tr.summary}</p>
                    </div>
                  ))}
                  <p className="nh-muted">
                    status: {row.snapshot.status}
                    {row.snapshot.scheduledAt ? ` · scheduled: ${row.snapshot.scheduledAt}` : ''}
                  </p>
                </div>
              )}
              {diffFor === row.version && previous && (
                <div>
                  <h3>{t('changes', { version: previous.version })}</h3>
                  {changes.length === 0 ? (
                    <p className="nh-muted">{t('noChanges')}</p>
                  ) : (
                    <ul>
                      {changes.map((change, index) => (
                        <li key={`${change.field}-${index}`}>
                          <code>{change.field}</code>
                          <br />
                          <span className="nh-muted">− {change.before}</span>
                          <br />
                          <span>+ {change.after}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {restoreTarget && (
        <ConfirmDialog
          title={t('restoreTitle', { version: restoreTarget.version })}
          message={t('restoreMessage')}
          confirmLabel={t('restore')}
          onConfirm={() => {
            const target = restoreTarget;
            setRestoreTarget(null);
            void restore(target);
          }}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}
