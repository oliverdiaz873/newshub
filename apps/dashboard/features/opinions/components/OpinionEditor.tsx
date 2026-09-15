'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { ConfirmDialog, Modal } from '@/shared/components/Modal';
import { SeoChecklist } from '@/features/editorial-shared/components/SeoChecklist';
import { LocaleTabs } from '@/features/editorial-shared/components/LocaleTabs';
import { HistoryPanel } from '@/features/editorial-shared/components/HistoryPanel';
import { ScheduleSection } from '@/features/editorial-shared/components/ScheduleSection';
import { ErrorState } from '@/shared/components/States';
import { MediaPicker } from '@/components/MediaPicker';
import { useDirtyGuard } from '@/shared/lib/dirty';
import { buildTranslations } from '@/features/editorial-shared/lib/validate-content';
import {
  OPINION_FIELD_ORDER,
  validateOpinionForm,
  type OpinionFieldKey,
  type OpinionFormValue,
} from '../validate';
import type { EditorOption } from '@/features/editorial-shared/types';
import {
  createOpinion,
  getOpinionAuthors,
  removeOpinion,
  transitionOpinion,
  updateOpinion,
} from '../services/opinionService';

export const EMPTY_OPINION_FORM: OpinionFormValue = {
  authorId: '',
  coverMediaId: '',
  es: { slug: '', title: '', summary: '', content: '' },
  en: { slug: '', title: '', summary: '', content: '' },
};

function errorCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/**
 * Opinion editor (no category, no curation flags by design; author required).
 * Same guards as articles: validation before rebaseline, failed saves keep
 * dirty state, published items are strictly unpublish-first.
 */
export function OpinionEditor({
  mode,
  opinionId,
  initial,
  status,
  scheduledAt,
  firstPublishedAt,
  updatedAt,
  onSaved,
  onDeleted,
}: {
  mode: 'create' | 'edit';
  opinionId?: string;
  initial: OpinionFormValue;
  status?: string;
  scheduledAt?: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations('opinions');
  const ta = useTranslations('articles');
  const th = useTranslations('history');
  const { apiFetch, user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const isReviewer = user?.role === 'reviewer';
  const canEdit = !isReviewer;

  const [form, setForm] = useState<OpinionFormValue>(initial);
  const [liveStatus, setLiveStatus] = useState(status ?? 'draft');
  const [tab, setTab] = useState<'es' | 'en'>('es');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OpinionFieldKey, 'required' | 'slug'>>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | 'discard' | 'unpublish' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [authors, setAuthors] = useState<EditorOption[]>([]);

  const { dirty, markClean } = useDirtyGuard(form);
  const published = liveStatus === 'published';

  const set = useCallback(<K extends keyof OpinionFormValue>(key: K, next: OpinionFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: next }));
  }, []);

  const setTr = useCallback((locale: 'es' | 'en', key: keyof OpinionFormValue['es'], next: string) => {
    setForm((current) => ({ ...current, [locale]: { ...current[locale], [key]: next } }));
  }, []);

  useEffect(() => {
    // Author options load once per editor mount.
    void (async () => {
      try {
        const auths = await getOpinionAuthors(apiFetch);
        if (!auths.ok) return;
        const json = (await auths.json()) as Array<{
          id: string;
          slug: string;
          translations: Array<{ locale: string; name: string }>;
        }>;
        setAuthors(
          json.map((a) => ({
            id: a.id,
            label: `${a.translations.find((tr) => tr.locale === 'es')?.name ?? a.slug} (${a.slug})`,
          })),
        );
      } catch {
        // Author select stays usable-empty with validation.
      }
    })();
  }, [apiFetch]);

  function runValidation(): boolean {
    const errors = validateOpinionForm(form);
    setFieldErrors(errors);
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      const first = OPINION_FIELD_ORDER.find((key) => errors[key]);
      if (first) {
        document.getElementById(`oe-${first.replace('.', '-')}`)?.focus();
      }
      return false;
    }
    return true;
  }

  function fieldMessage(key: OpinionFieldKey): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    return err === 'slug' ? ta('invalidSlug') : ta('required');
  }

  async function persist(action: 'create' | 'save' | 'review'): Promise<string | null> {
    if (!runValidation()) return null;
    setBusy(true);
    setLoadError(null);
    try {
      if (action === 'create') {
        const res = await createOpinion(apiFetch, {
          authorId: form.authorId,
          coverMediaId: form.coverMediaId || undefined,
          translations: buildTranslations(form.es, form.en),
        });
        if (!res.ok) {
          const code = errorCode(await res.json().catch(() => null));
          if (code === 'slug_taken') {
            setFieldErrors({ 'es.slug': 'slug' });
            document.getElementById('oe-es-slug')?.focus();
          } else {
            setLoadError(code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`);
          }
          return null;
        }
        const created = (await res.json()) as { id: string };
        markClean();
        notify(t('created'), 'ok');
        return created.id;
      }
      if (!opinionId) return null;
      const body: Record<string, unknown> = {
        authorId: form.authorId,
        coverMediaId: form.coverMediaId === '' ? null : form.coverMediaId || undefined,
        translations: buildTranslations(form.es, form.en),
      };
      if (action === 'review') body.status = 'review';
      const res = await updateOpinion(apiFetch, opinionId, body);
      if (!res.ok) {
        const code = errorCode(await res.json().catch(() => null));
        if (code === 'slug_taken') {
          setFieldErrors({ 'es.slug': 'slug' });
          document.getElementById('oe-es-slug')?.focus();
        } else {
          setLoadError(code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`);
        }
        return null;
      }
      markClean();
      if (action === 'review') setLiveStatus('review');
      notify(t('saved'), 'ok');
      return opinionId;
    } finally {
      setBusy(false);
    }
  }

  async function runTransition(action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'reject', reason?: string) {
    if (!opinionId) return;
    setBusy(true);
    try {
      const cleanReason = reason?.trim() ? reason.trim().slice(0, 500) : undefined;
      const res = await transitionOpinion(
        apiFetch,
        opinionId,
        action,
        action === 'reject' ? { reason: cleanReason } : undefined,
      );
      if (!res.ok) {
        const code = errorCode(await res.json().catch(() => null));
        notify(code === 'invalid_transition' && action === 'publish' && liveStatus === 'draft' ? ta('publishNeedsReview') : code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`, 'err');
        return;
      }
      const updated = (await res.json().catch(() => null)) as { status?: string } | null;
      if (updated?.status) setLiveStatus(updated.status);
      markClean();
      notify(action === 'publish' ? t('publishedOk') : action === 'reject' ? t('rejectedOk') : t('saved'), 'ok');
      if (action === 'publish' || action === 'restore') onSaved(opinionId);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!opinionId) return;
    setBusy(true);
    try {
      const res = await removeOpinion(apiFetch, opinionId);
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  function trField(locale: 'es' | 'en', key: keyof OpinionFormValue['es'], label: string, multiline = false) {
    const id = `oe-${locale}-${key}`;
    const errKey = `${locale}.${key}` as OpinionFieldKey;
    const message = fieldMessage(errKey);
    const common = {
      id,
      value: form[locale][key],
      disabled: busy || published || isReviewer,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setTr(locale, key, event.target.value),
      onBlur: () => {
        if (touched) setFieldErrors(validateOpinionForm({ ...form }));
      },
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${id}-err` : undefined,
    };
    return (
      <div className="nh-field">
        <label htmlFor={id}>{label}</label>
        {multiline ? <textarea rows={6} {...common} /> : <input type="text" {...common} />}
        {message && (
          <span id={`${id}-err`} className="nh-muted" role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {loadError && <ErrorState message={loadError} />}
      {dirty && (
        <p className="nh-muted" role="status">
          {ta('unsaved')}
        </p>
      )}

      <LocaleTabs tab={tab} onTab={setTab} labelEs={ta('tabEs')} labelEn={ta('tabEn')} panelId="oe-locale-panel" />

      {mode === 'edit' && opinionId && (
        <div className="nh-row">
          <button
            className={showHistory ? 'nh-btn primary' : 'nh-btn'}
            type="button"
            aria-expanded={showHistory}
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? th('backToEdit') : th('showHistory')}
          </button>
        </div>
      )}

      {mode === 'edit' && opinionId && showHistory ? (
        <HistoryPanel kind="opinion" id={opinionId} onRestored={() => onSaved(opinionId)} />
      ) : (
        <>
          {tab === 'es' ? (
        <section className="nh-card" role="tabpanel" id="oe-locale-panel" aria-label={ta('tabEs')}>
          {trField('es', 'slug', ta('fieldSlug'))}
          {trField('es', 'title', ta('fieldTitle'))}
          {trField('es', 'summary', ta('fieldSummary'))}
          {trField('es', 'content', ta('fieldContent'), true)}
        </section>
      ) : (
        <section className="nh-card" role="tabpanel" id="oe-locale-panel" aria-label={ta('tabEn')}>
          {trField('en', 'slug', ta('fieldSlug'))}
          {trField('en', 'title', ta('fieldTitle'))}
          {trField('en', 'summary', ta('fieldSummary'))}
          {trField('en', 'content', ta('fieldContent'), true)}
        </section>
      )}

      <section className="nh-card" aria-label={ta('relations')}>
        <div className="nh-field">
          <label htmlFor="oe-author">{t('authorRequired')}</label>
          <select
            id="oe-author"
            value={form.authorId}
            disabled={busy || published || isReviewer}
            onChange={(event) => set('authorId', event.target.value)}
            aria-invalid={touched && fieldErrors.authorId ? true : undefined}
          >
            <option value="">{t('allAuthors')}</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {touched && fieldErrors.authorId && (
            <span className="nh-muted" role="alert">
              {t('selectAuthor')}
            </span>
          )}
        </div>
        <div className="nh-field">
          <span className="nh-muted">{ta('fieldCover')}</span>
          {published ? (
            <span className="nh-muted">{ta('fieldNoCover')}</span>
          ) : (
            <MediaPicker value={form.coverMediaId || null} onChange={(id) => set('coverMediaId', id ?? '')} />
          )}
        </div>
      </section>

      {mode === 'edit' && published && (
        <div className="nh-card" role="note">
          <p>{t('publishedNotice')}</p>
          <button className="nh-btn primary" type="button" disabled={busy} onClick={() => setConfirm('unpublish')}>
            {ta('unpublishFirst')}
          </button>
        </div>
      )}

      {mode === 'edit' && opinionId && canEdit && (
        <ScheduleSection
          kind="opinion"
          id={opinionId}
          status={liveStatus}
          scheduledAt={scheduledAt ?? null}
          onChanged={() => onSaved(opinionId)}
        />
      )}

      <SeoChecklist
        signals={{
          esTitle: form.es.title,
          esSummary: form.es.summary,
          coverMediaId: form.coverMediaId || null,
          hasEn: form.en.title.trim().length > 0,
          firstPublishedAt: firstPublishedAt ?? null,
          updatedAt: updatedAt ?? null,
          scheduledAt: scheduledAt ?? null,
        }}
      />

      <div className="nh-row">
        {mode === 'create' ? (
          canEdit ? (
            <button
              className="nh-btn primary"
              type="button"
              disabled={busy}
              onClick={() => {
                void persist('create').then((id) => {
                  if (id) onSaved(id);
                });
              }}
            >
              {t('create')}
            </button>
          ) : null
        ) : (
          !published && (
            <>
              {canEdit && (
                <button
                  className="nh-btn primary"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void persist('save').then((id) => {
                      if (id) onSaved(id);
                    });
                  }}
                >
                  {ta('save')}
                </button>
              )}
              {canEdit && liveStatus === 'draft' && (
                <button
                  className="nh-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void persist('review');
                  }}
                >
                  {ta('submitReview')}
                </button>
              )}
              {liveStatus === 'review' && (
                <button
                  className="nh-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void runTransition('publish');
                  }}
                >
                  {ta('publish')}
                </button>
              )}
              {liveStatus === 'review' && (
                <button
                  className="nh-btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRejectReason('');
                    setRejectError(null);
                    setConfirm('reject');
                  }}
                >
                  {ta('actionReject')}
                </button>
              )}
              {canEdit && liveStatus === 'archived' && (
                <button className="nh-btn" type="button" disabled={busy} onClick={() => void runTransition('restore')}>
                  {ta('actionRestore')}
                </button>
              )}
              {canEdit && liveStatus !== 'archived' && liveStatus !== 'review' && (
                <button className="nh-btn" type="button" disabled={busy} onClick={() => setConfirm('archive')}>
                  {ta('actionArchive')}
                </button>
              )}
              {canEdit && (
                <button className="nh-btn danger" type="button" disabled={busy} onClick={() => setConfirm('delete')}>
                  {ta('actionDelete')}
                </button>
              )}
            </>
          )
        )}
        <button
          className="nh-btn"
          type="button"
          onClick={() => {
            if (dirty) setConfirm('discard');
            else router.push('/opinions');
          }}
        >
          {'← /opinions'}
        </button>
      </div>
        </>
      )}

      {confirm === 'archive' && (
        <ConfirmDialog
          title={t('archiveTitle')}
          message={t('archiveMessage', { title: form.es.title || form.es.slug || '…' })}
          onConfirm={() => {
            setConfirm(null);
            void runTransition('archive');
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage', { title: form.es.title || form.es.slug || '…' })}
          confirmLabel={ta('actionDelete')}
          onConfirm={() => {
            setConfirm(null);
            void remove();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'reject' && (
        <Modal
          title={t('rejectTitle')}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p className="nh-muted">{t('rejectMessage', { title: form.es.title || form.es.slug || '…' })}</p>
          <div className="nh-field">
            <label htmlFor="oe-reject-reason">{ta('rejectReason')}</label>
            <textarea
              id="oe-reject-reason"
              rows={4}
              maxLength={500}
              value={rejectReason}
              disabled={busy}
              onChange={(event) => setRejectReason(event.target.value)}
              aria-describedby="oe-reject-reason-hint"
            />
            <span id="oe-reject-reason-hint" className="nh-muted">
              {ta('rejectReasonHint', { count: rejectReason.trim().length })}
            </span>
            {rejectError && (
              <span className="nh-muted" role="alert">
                {rejectError}
              </span>
            )}
          </div>
          <div className="nh-row">
            <button className="nh-btn" type="button" disabled={busy} onClick={() => setConfirm(null)}>
              {ta('cancelAction')}
            </button>
            <button
              className="nh-btn danger"
              type="button"
              disabled={busy}
              autoFocus
              onClick={() => {
                if (rejectReason.trim().length > 500) {
                  setRejectError(ta('rejectReasonTooLong'));
                  return;
                }
                const reason = rejectReason;
                setConfirm(null);
                setRejectReason('');
                void runTransition('reject', reason);
              }}
            >
              {ta('actionReject')}
            </button>
          </div>
        </Modal>
      )}
      {confirm === 'unpublish' && (
        <ConfirmDialog
          title={ta('actionUnpublish')}
          message={t('publishedNotice')}
          onConfirm={() => {
            setConfirm(null);
            void runTransition('unpublish');
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'discard' && (
        <ConfirmDialog
          title={ta('discardTitle')}
          message={ta('discardMessage')}
          confirmLabel={ta('leave')}
          onConfirm={() => router.push('/opinions')}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
