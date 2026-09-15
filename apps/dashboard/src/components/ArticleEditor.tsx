'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  ARTICLE_FIELD_ORDER,
  buildTranslations,
  validateArticleForm,
  type ArticleFormValue,
  type FieldKey,
} from '@/lib/validate-article';

import type { EditorOption } from '@/features/editorial-shared/types';

export const EMPTY_FORM: ArticleFormValue = {
  categoryId: '',
  authorId: '',
  coverMediaId: '',
  isBreaking: false,
  isFeatured: false,
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
 * Shared article editor (create + edit). Validation always runs before any
 * dirty-state rebaseline; failed Save/Publish keeps the dirty flag.
 * Published items are strictly unpublish-first (no ordinary PATCH).
 */
export function ArticleEditor({
  mode,
  articleId,
  initial,
  status,
  scheduledAt,
  firstPublishedAt,
  updatedAt,
  onSaved,
  onDeleted,
}: {
  mode: 'create' | 'edit';
  articleId?: string;
  initial: ArticleFormValue;
  status?: string;
  scheduledAt?: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
}) {
  const t = useTranslations('articles');
  const th = useTranslations('history');
  const { apiFetch, user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const isReviewer = user?.role === 'reviewer';
  const canEdit = !isReviewer;

  const [form, setForm] = useState<ArticleFormValue>(initial);
  const [liveStatus, setLiveStatus] = useState(status ?? 'draft');
  const [tab, setTab] = useState<'es' | 'en'>('es');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, 'required' | 'slug'>>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | 'discard' | 'unpublish' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [categories, setCategories] = useState<EditorOption[]>([]);
  const [authors, setAuthors] = useState<EditorOption[]>([]);
  const firstInvalidRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  const { dirty, markClean } = useDirtyGuard(form);
  const published = liveStatus === 'published';

  const set = useCallback(<K extends keyof ArticleFormValue>(key: K, next: ArticleFormValue[K]) => {
    setForm((current) => ({ ...current, [key]: next }));
  }, []);

  const setTr = useCallback((locale: 'es' | 'en', key: keyof ArticleFormValue['es'], next: string) => {
    setForm((current) => ({ ...current, [locale]: { ...current[locale], [key]: next } }));
  }, []);

  useEffect(() => {
    // Reference data loads once per editor mount (not per keystroke).
    void (async () => {
      try {
        const [cats, auths] = await Promise.all([
          apiFetch('/editorial/categories?locale=es&limit=100'),
          apiFetch('/authors'),
        ]);
        if (cats.ok) {
          const json = (await cats.json()) as { data: Array<{ id: string; slug: string; label: string }> };
          setCategories(json.data.map((c) => ({ id: c.id, label: `${c.label} (${c.slug})` })));
        }
        if (auths.ok) {
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
        }
      } catch {
        // Reference lists are best-effort; selects stay usable-empty with validation.
      }
    })();
  }, [apiFetch]);

  function runValidation(): boolean {
    const errors = validateArticleForm(form);
    setFieldErrors(errors);
    setTouched(true);
    if (Object.keys(errors).length > 0) {
      const first = ARTICLE_FIELD_ORDER.find((key) => errors[key]);
      if (first) {
        document.getElementById(`ae-${first.replace('.', '-')}`)?.focus();
      }
      return false;
    }
    return true;
  }

  function fieldMessage(key: FieldKey): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    return err === 'slug' ? t('invalidSlug') : t('required');
  }

  async function persist(action: 'create' | 'save' | 'review'): Promise<string | null> {
    if (!runValidation()) return null;
    setBusy(true);
    setLoadError(null);
    try {
      if (action === 'create') {
        const res = await apiFetch('/articles', {
          method: 'POST',
          body: JSON.stringify({
            categoryId: form.categoryId,
            authorId: form.authorId || undefined,
            coverMediaId: form.coverMediaId || undefined,
            translations: buildTranslations(form),
          }),
        });
        if (!res.ok) {
          const code = errorCode(await res.json().catch(() => null));
          if (code === 'slug_taken') {
            setFieldErrors({ 'es.slug': 'slug' });
            document.getElementById('ae-es-slug')?.focus();
          } else {
            setLoadError(code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`);
          }
          return null;
        }
        const created = (await res.json()) as { id: string };
        markClean();
        notify(t('created'), 'ok');
        return created.id;
      }
      if (!articleId) return null;
      const body: Record<string, unknown> = {
        categoryId: form.categoryId || undefined,
        authorId: form.authorId === '' ? null : form.authorId || undefined,
        coverMediaId: form.coverMediaId === '' ? null : form.coverMediaId || undefined,
        isBreaking: form.isBreaking,
        isFeatured: form.isFeatured,
        translations: buildTranslations(form),
      };
      if (action === 'review') body.status = 'review';
      const res = await apiFetch(`/articles/${articleId}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (!res.ok) {
        const code = errorCode(await res.json().catch(() => null));
        if (code === 'slug_taken') {
          setFieldErrors({ 'es.slug': 'slug' });
          document.getElementById('ae-es-slug')?.focus();
        } else {
          setLoadError(code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`);
        }
        return null;
      }
      markClean();
      if (action === 'review') setLiveStatus('review');
      notify(t('saved'), 'ok');
      return articleId;
    } finally {
      setBusy(false);
    }
  }

  async function runTransition(action: 'publish' | 'unpublish' | 'archive' | 'restore' | 'reject', reason?: string) {
    if (!articleId) return;
    setBusy(true);
    try {
      const init: RequestInit = { method: 'POST' };
      if (action === 'reject') {
        init.body = JSON.stringify({ reason: reason?.trim() ? reason.trim().slice(0, 500) : undefined });
      }
      const res = await apiFetch(`/articles/${articleId}/${action}`, init);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const code = errorCode(body);
        if (code === 'invalid_transition' && action === 'publish') {
          const detail = typeof body === 'object' && body !== null && 'message' in body ? String((body as { message?: unknown }).message ?? '') : '';
          notify(detail.includes('review') || liveStatus === 'draft' ? t('publishNeedsReview') : t('invalidTransition'), 'err');
        } else {
          notify(code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`, 'err');
        }
        return;
      }
      const updated = (await res.json().catch(() => null)) as { status?: string } | null;
      if (updated?.status) setLiveStatus(updated.status);
      markClean();
      notify(action === 'publish' ? t('publishedOk') : action === 'reject' ? t('rejectedOk') : t('saved'), 'ok');
      if (action === 'publish' || action === 'restore') onSaved(articleId);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!articleId) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/articles/${articleId}`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  function trField(
    locale: 'es' | 'en',
    key: keyof ArticleFormValue['es'],
    label: string,
    multiline = false,
  ) {
    const id = `ae-${locale}-${key}`;
    const errKey = `${locale}.${key}` as FieldKey;
    const message = fieldMessage(errKey);
    const common = {
      id,
      value: form[locale][key],
      disabled: busy || published || isReviewer,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setTr(locale, key, event.target.value),
      onBlur: () => {
        if (touched) setFieldErrors(validateArticleForm({ ...form }));
      },
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${id}-err` : undefined,
      ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        if (errKey === 'es.slug') firstInvalidRef.current = el;
      },
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
      {dirty && <p className="nh-muted" role="status">{t('unsaved')}</p>}

      <LocaleTabs tab={tab} onTab={setTab} labelEs={t('tabEs')} labelEn={t('tabEn')} panelId="ae-locale-panel" />

      {mode === 'edit' && articleId && (
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

      {mode === 'edit' && articleId && showHistory ? (
        <HistoryPanel kind="article" id={articleId} onRestored={() => onSaved(articleId)} />
      ) : (
        <>
          {tab === 'es' ? (
        <section className="nh-card" role="tabpanel" id="ae-locale-panel" aria-label={t('tabEs')}>
          {trField('es', 'slug', t('fieldSlug'))}
          {trField('es', 'title', t('fieldTitle'))}
          {trField('es', 'summary', t('fieldSummary'))}
          {trField('es', 'content', t('fieldContent'), true)}
        </section>
      ) : (
        <section className="nh-card" role="tabpanel" id="ae-locale-panel" aria-label={t('tabEn')}>
          {trField('en', 'slug', t('fieldSlug'))}
          {trField('en', 'title', t('fieldTitle'))}
          {trField('en', 'summary', t('fieldSummary'))}
          {trField('en', 'content', t('fieldContent'), true)}
        </section>
      )}

      <section className="nh-card" aria-label={t('relations')}>
        <div className="nh-field">
          <label htmlFor="ae-category">{t('category')}</label>
          <select
            id="ae-category"
            value={form.categoryId}
            disabled={busy || published || isReviewer}
            onChange={(event) => set('categoryId', event.target.value)}
            aria-invalid={touched && fieldErrors.categoryId ? true : undefined}
          >
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {touched && fieldErrors.categoryId && (
            <span className="nh-muted" role="alert">
              {t('selectCategory')}
            </span>
          )}
        </div>
        <div className="nh-field">
          <label htmlFor="ae-author">{t('author')}</label>
          <select
            id="ae-author"
            value={form.authorId}
            disabled={busy || published || isReviewer}
            onChange={(event) => set('authorId', event.target.value)}
          >
            <option value="">{t('allAuthors')}</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="nh-field">
          <span className="nh-muted">{t('fieldCover')}</span>
          {published ? (
            <span className="nh-muted">{t('fieldNoCover')}</span>
          ) : (
            <MediaPicker value={form.coverMediaId || null} onChange={(id) => set('coverMediaId', id ?? '')} />
          )}
        </div>
        <div className="nh-row">
          <label>
            <input
              type="checkbox"
              checked={form.isBreaking}
              disabled={busy || published || isReviewer}
              onChange={(event) => set('isBreaking', event.target.checked)}
            />{' '}
            {t('fieldBreaking')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isFeatured}
              disabled={busy || published || isReviewer}
              onChange={(event) => set('isFeatured', event.target.checked)}
            />{' '}
            {t('fieldFeatured')}
          </label>
        </div>
      </section>

      {mode === 'edit' && published && (
        <div className="nh-card" role="note">
          <p>{t('publishedNotice')}</p>
          <button className="nh-btn primary" type="button" disabled={busy} onClick={() => setConfirm('unpublish')}>
            {t('unpublishFirst')}
          </button>
        </div>
      )}

      {mode === 'edit' && articleId && canEdit && (
        <ScheduleSection
          kind="article"
          id={articleId}
          status={liveStatus}
          scheduledAt={scheduledAt ?? null}
          onChanged={() => onSaved(articleId)}
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
                  {t('save')}
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
                  {t('submitReview')}
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
                  {t('publish')}
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
                  {t('actionReject')}
                </button>
              )}
              {canEdit && liveStatus === 'archived' && (
                <button className="nh-btn" type="button" disabled={busy} onClick={() => void runTransition('restore')}>
                  {t('actionRestore')}
                </button>
              )}
              {canEdit && liveStatus !== 'archived' && liveStatus !== 'review' && (
                <button className="nh-btn" type="button" disabled={busy} onClick={() => setConfirm('archive')}>
                  {t('actionArchive')}
                </button>
              )}
              {canEdit && (
                <button className="nh-btn danger" type="button" disabled={busy} onClick={() => setConfirm('delete')}>
                  {t('actionDelete')}
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
            else router.push('/articles');
          }}
        >
          {'← /articles'}
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
          confirmLabel={t('actionDelete')}
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
            <label htmlFor="ae-reject-reason">{t('rejectReason')}</label>
            <textarea
              id="ae-reject-reason"
              rows={4}
              maxLength={500}
              value={rejectReason}
              disabled={busy}
              onChange={(event) => setRejectReason(event.target.value)}
              aria-invalid={rejectError ? true : undefined}
              aria-describedby={rejectError ? 'ae-reject-reason-err' : 'ae-reject-reason-hint'}
            />
            <span id="ae-reject-reason-hint" className="nh-muted">
              {t('rejectReasonHint', { count: rejectReason.trim().length })}
            </span>
            {rejectError && (
              <span id="ae-reject-reason-err" className="nh-muted" role="alert">
                {rejectError}
              </span>
            )}
          </div>
          <div className="nh-row">
            <button
              className="nh-btn"
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              {t('cancelAction')}
            </button>
            <button
              className="nh-btn danger"
              type="button"
              disabled={busy}
              autoFocus
              onClick={() => {
                if (rejectReason.trim().length > 500) {
                  setRejectError(t('rejectReasonTooLong'));
                  return;
                }
                const reason = rejectReason;
                setConfirm(null);
                setRejectReason('');
                void runTransition('reject', reason);
              }}
            >
              {t('actionReject')}
            </button>
          </div>
        </Modal>
      )}
      {confirm === 'unpublish' && (
        <ConfirmDialog
          title={t('actionUnpublish')}
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
          title={t('discardTitle')}
          message={t('discardMessage')}
          confirmLabel={t('leave')}
          onConfirm={() => router.push('/articles')}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
