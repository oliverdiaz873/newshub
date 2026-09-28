'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useUiPrefs } from '@/shared/lib/ui-prefs';
import { useDirtyGuard } from '@/shared/lib/dirty';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Paginator, Table } from '@/shared/components/Table';
import { createCategory, listCategories, removeCategory, updateCategory } from '../services/categoryService';
import type { CategoryForm, CategoryFormError, CategoryRow } from '../types';
import { EMPTY_CATEGORY_FORM, validateCategoryForm } from '../validate';

const PAGE_SIZES = [10, 20, 50];

export function CategoryManager() {
  const t = useTranslations('categories');
  const tc = useTranslations('common');
  const { apiFetch, user } = useAuth();
  const { previewLang } = useUiPrefs();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Inc 1: reviewer can read the editorial catalog but the API rejects writes
  // (admin/editor only). Mirror ArticleList's isReviewer pattern: hide the
  // write UI instead of letting the reviewer hit a raw HTTP 403.
  const isReviewer = user?.role === 'reviewer';

  const editorialLocale = previewLang === 'en-first' ? 'en' : 'es';

  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Inc 1 (CAT-P0-01): ES source of truth for the write form. The display list
  // follows editorialLocale (es/en-first) but the form fields are ES-labeled,
  // so editing must never start from an EN row.
  const [esById, setEsById] = useState<Record<string, CategoryRow>>({});
  // Inc 3: EN coverage for the Languages column (id set with EN translation).
  const [enIds, setEnIds] = useState<Record<string, true>>({});
  const [form, setForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  // Inc 3: dirty guard over the inline form (mirrors ArticleEditor's
  // useDirtyGuard: visual flag + beforeunload + discard confirm).
  const { dirty: formDirty, reset: resetDirty } = useDirtyGuard(form);
  const [editing, setEditing] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CategoryFormError>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  // Inc 3: list state lives in the URL (?q=&page=&limit=), mirroring
  // ArticleList's URL sync so filters survive reload/share/back-forward.
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1) || 1);
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get('limit') ?? 0);
    return fromUrl === 10 || fromUrl === 20 || fromUrl === 50 ? fromUrl : 20;
  });
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);
  // Inc 3: pending discard (Cancel button or row-switch while dirty).
  const [discard, setDiscard] = useState<{ next: CategoryRow | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Inc 3: page through meta.total (API MAX_LIMIT=100) instead of
      // silently truncating past 100 rows. ES + EN load in parallel: ES feeds
      // the write form (CAT-P0-01), EN feeds the Languages column.
      async function fetchAll(locale: string): Promise<CategoryRow[] | 'unauthorized'> {
        const all: CategoryRow[] = [];
        let pageNo = 1;
        let totalPages = 1;
        do {
          const res = await listCategories(apiFetch, locale, pageNo);
          if (res.status === 401) return 'unauthorized';
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as {
            data: CategoryRow[];
            meta: { total: number; totalPages: number };
          };
          all.push(...json.data);
          totalPages = json.meta?.totalPages ?? 1;
          pageNo += 1;
        } while (pageNo <= totalPages);
        return all;
      }
      const [esRows, enRows] = await Promise.all([fetchAll('es'), fetchAll('en')]);
      if (esRows === 'unauthorized' || enRows === 'unauthorized') {
        setError(tc('sessionRequired'));
        setItems([]);
        setEsById({});
        setEnIds({});
        return;
      }
      setItems(editorialLocale === 'es' ? esRows : enRows);
      setEsById(Object.fromEntries(esRows.map((row) => [row.id, row])));
      setEnIds(
        Object.fromEntries(enRows.filter((row) => row.fallback === false).map((row) => [row.id, true])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, editorialLocale, tc]);

  useEffect(() => {
    // Catalog (re)load per mount/locale (client filter + pager below).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Inc 3: back/forward support — URL is the source of truth for q/page/limit.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery(searchParams.get('q') ?? '');
    setPage(Number(searchParams.get('page') ?? 1) || 1);
    const fromUrl = Number(searchParams.get('limit') ?? 0);
    setLimit(fromUrl === 10 || fromUrl === 20 || fromUrl === 50 ? fromUrl : 20);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  // Inc 3: write-through URL sync (defaults omitted, like ArticleList).
  const syncUrl = useCallback(
    (patch: Partial<{ q: string; page: number; limit: number }>) => {
      const params = new URLSearchParams();
      const next = {
        q: patch.q ?? query,
        page: patch.page ?? page,
        limit: patch.limit ?? limit,
      };
      if (next.q.trim()) params.set('q', next.q);
      if (next.page !== 1) params.set('page', String(next.page));
      if (next.limit !== 20) params.set('limit', String(next.limit));
      const qs = params.toString();
      router.replace(qs ? `/categories?${qs}` : '/categories', { scroll: false });
    },
    [router, query, page, limit],
  );

  function payload() {
    const translations: Array<{ locale: string; slug: string; label: string; description?: string | null }> = [
      { locale: 'es', slug: form.esSlug.trim(), label: form.esLabel.trim(), description: form.esDesc.trim() || null },
    ];
    if (form.enSlug.trim() && form.enLabel.trim()) {
      translations.push({ locale: 'en', slug: form.enSlug.trim(), label: form.enLabel.trim() });
    }
    return { sort: Number(form.sort) || 0, translations };
  }

  function runValidation(): boolean {
    const errors = validateCategoryForm(form);
    setFieldErrors(errors);
    setTouched(true);
    const order: Array<keyof CategoryForm> = ['sort', 'esSlug', 'esLabel', 'enSlug', 'enLabel'];
    const first = order.find((key) => errors[key as keyof CategoryFormError]);
    if (first) {
      document.getElementById(`cat-${first}`)?.focus();
      return false;
    }
    return Object.keys(errors).length === 0;
  }

  // Inc 2: veracious API errors. The API returns RFC7807 codes (problem.filter:
  // slug_taken, forbidden, not_found, validation_failed/bad_request...).
  // Map them to specific messages instead of a raw `HTTP xxx`.
  async function readCode(res: Response): Promise<string | null> {
    const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
    if (typeof body?.code === 'string') return body.code;
    if (res.status === 401) return 'unauthorized';
    if (res.status === 403) return 'forbidden';
    if (res.status === 404) return 'not_found';
    if (res.status === 422 || res.status === 400) return 'validation_failed';
    return null;
  }

  function apiErrorMessage(status: number, code: string | null): string {
    if (code === 'forbidden') return tc('insufficientRole');
    if (code === 'unauthorized') return tc('sessionRequired');
    if (code === 'not_found') return t('categoryNotFound');
    if (code === 'validation_failed' || code === 'bad_request') return t('apiValidationFailed');
    return tc('httpError', { status });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (isReviewer) return;
    if (!runValidation()) return;
    setBusy(true);
    try {
      const res = await createCategory(apiFetch, payload());
      if (!res.ok) {
        const code = await readCode(res);
        if (code === 'slug_taken') {
          setFieldErrors({ esSlug: 'taken' });
          document.getElementById('cat-esSlug')?.focus();
        } else {
          setError(apiErrorMessage(res.status, code));
        }
        return;
      }
      setForm(EMPTY_CATEGORY_FORM);
      setFieldErrors({});
      setTouched(false);
      resetDirty(EMPTY_CATEGORY_FORM);
      notify(t('created'), 'ok');
      await load();
      focusListTitle();
    } finally {
      setBusy(false);
    }
  }

  // Inc 3: shared form reset (keeps the dirty baseline in sync).
  function resetForm() {
    setEditing(null);
    setForm(EMPTY_CATEGORY_FORM);
    setFieldErrors({});
    setTouched(false);
    resetDirty(EMPTY_CATEGORY_FORM);
  }

  // Inc 4: return focus to the list after a successful write/delete so
  // keyboard + screen-reader users land on the updated content. Toasts
  // already announce via role=status (ok) / role=alert (err).
  function focusListTitle() {
    document.getElementById('cat-list-title')?.focus();
  }

  function seedEdit(row: CategoryRow) {
    // CAT-P0-01: never seed ES fields from the display-locale row. The table
    // may show EN (en-first) while the form is ES-labeled; writing those EN
    // values back as locale:es would silently overwrite the Spanish
    // translation. Prefer the ES fetch; fall back to the row only when the ES
    // fetch failed (ES is server-guaranteed, so this is exceptional).
    const esRow = esById[row.id] ?? (editorialLocale === 'es' ? row : undefined);
    const source = esRow ?? row;
    const next: CategoryForm = {
      ...EMPTY_CATEGORY_FORM,
      sort: String(source.sort),
      esSlug: source.slug,
      esLabel: source.label,
      esDesc: source.description ?? '',
    };
    setEditing(row.id);
    setFieldErrors({});
    setTouched(false);
    setForm(next);
    resetDirty(next);
  }

  function startEdit(row: CategoryRow) {
    if (isReviewer) return;
    // Inc 3: don't silently wipe unsaved form input when switching rows.
    if (formDirty) {
      setDiscard({ next: row });
      return;
    }
    seedEdit(row);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (isReviewer) return;
    if (!editing || !runValidation()) return;
    setBusy(true);
    try {
      const res = await updateCategory(apiFetch, editing, payload());
      if (!res.ok) {
        const code = await readCode(res);
        if (code === 'slug_taken') {
          setFieldErrors({ esSlug: 'taken' });
          document.getElementById('cat-esSlug')?.focus();
        } else {
          setError(apiErrorMessage(res.status, code));
        }
        return;
      }
      setEditing(null);
      setForm(EMPTY_CATEGORY_FORM);
      setFieldErrors({});
      setTouched(false);
      resetDirty(EMPTY_CATEGORY_FORM);
      notify(t('saved'), 'ok');
      await load();
      focusListTitle();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: CategoryRow) {
    if (isReviewer) return;
    const res = await removeCategory(apiFetch, row.id);
    if (!res.ok) {
      if (res.status === 409) {
        notify(t('blockedArticles'), 'err');
        return;
      }
      const code = await readCode(res);
      setError(apiErrorMessage(res.status, code));
      return;
    }
    notify(t('deleted'), 'ok');
    await load();
    focusListTitle();
  }

  const set = (key: keyof CategoryForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function fieldMessage(key: keyof CategoryFormError): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    if (err === 'taken') return t('slugTaken');
    if (err === 'slug') return t('invalidSlug');
    if (err === 'number') return t('invalidSort');
    return t('required');
  }

  function textField(key: 'esSlug' | 'esLabel' | 'enSlug' | 'enLabel', label: string, required = false) {
    const id = `cat-${key}`;
    const message = fieldMessage(key);
    return (
      <div className="nh-field">
        <label htmlFor={id}>
          {label}
          {required && (
            <span className="nh-req" aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
        <input
          id={id}
          value={form[key]}
          onChange={set(key)}
          disabled={busy}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-err` : undefined}
          className={message ? 'invalid' : undefined}
        />
        {message && (
          <span id={`${id}-err`} className="nh-muted" role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  // Inc 3: filter matches the mockup (name + slug + description).
  const filtered = query.trim()
    ? items.filter((row) =>
        `${row.label} ${row.slug} ${row.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * limit, safePage * limit);

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!isReviewer && (
      <section className="nh-card" aria-label={editing ? t('edit') : t('new')}>
        <h2>{editing ? t('edit') : t('new')}</h2>
        {formDirty && (
          <p className="nh-dirty-flag" role="status">
            {t('unsaved')}
          </p>
        )}
        <form onSubmit={editing ? saveEdit : create} noValidate>
          <div className="nh-field">
            <label htmlFor="cat-sort">{t('fieldSort')}</label>
            <input
              id="cat-sort"
              value={form.sort}
              onChange={set('sort')}
              inputMode="numeric"
              disabled={busy}
              aria-invalid={touched && fieldErrors.sort ? true : undefined}
              className={touched && fieldErrors.sort ? 'invalid' : undefined}
            />
            {touched && fieldErrors.sort && (
              <span className="nh-muted" role="alert">
                {t('invalidSort')}
              </span>
            )}
          </div>
          {textField('esSlug', t('fieldSlugEs'), true)}
          {textField('esLabel', t('fieldLabelEs'), true)}
          <div className="nh-field">
            <label htmlFor="cat-esDesc">{t('fieldDescEs')}</label>
            <textarea id="cat-esDesc" value={form.esDesc} onChange={set('esDesc')} rows={2} disabled={busy} />
          </div>
          {textField('enSlug', t('fieldSlugEn'))}
          {textField('enLabel', t('fieldLabelEn'))}
          <div className="nh-row">
            <button className="nh-btn primary" type="submit" disabled={busy}>
              {editing ? t('save') : t('create')}
            </button>
            {editing && (
              <button
                className="nh-btn"
                type="button"
                disabled={busy}
                onClick={() => {
                  // Inc 3: Cancel with unsaved input asks first (no silent wipe).
                  if (formDirty) {
                    setDiscard({ next: null });
                    return;
                  }
                  resetForm();
                }}
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      </section>
      )}

      <section className="nh-card" aria-label={t('title')}>
        <h2 id="cat-list-title" tabIndex={-1}>
          {t('title')}
        </h2>
        <div className="nh-field">
          <label htmlFor="cat-q">{t('searchLabel')}</label>
          <input
            id="cat-q"
            type="search"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              syncUrl({ q: event.target.value, page: 1 });
            }}
          />
        </div>
        {loading ? (
          <Skeleton lines={4} />
        ) : filtered.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <Table label={t('title')}>
              <thead>
                <tr>
                  <th>{t('colLabel')}</th>
                  <th>{t('colSlug')}</th>
                  <th>{t('colSort')}</th>
                  <th>{t('colPieces')}</th>
                  <th>{t('colLanguages')}</th>
                  <th>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr
                    key={row.id}
                    className={editing === row.id ? 'is-selected' : undefined}
                    aria-current={editing === row.id ? true : undefined}
                  >
                    <td>
                      <div>{row.label}</div>
                      {row.description && <div className="nh-muted">{row.description}</div>}
                    </td>
                    <td>
                      <span className="nh-muted">{row.slug}</span>
                    </td>
                    <td>{row.sort}</td>
                    <td>
                      <span className="nh-sr-only">{t('colPieces')}: </span>
                      {row.articleCount}
                    </td>
                    <td>
                      <span className="nh-badge">ES</span>{' '}
                      {enIds[row.id] && <span className="nh-badge">EN</span>}
                    </td>
                    <td>
                      {isReviewer ? (
                        <span className="nh-muted" aria-hidden="true">
                          —
                        </span>
                      ) : (
                      <div className="nh-row">
                        <button className="nh-btn" type="button" disabled={busy} onClick={() => startEdit(row)}>
                          {t('actionEdit')}
                        </button>
                        <button
                          className="nh-btn danger"
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirm(row)}
                        >
                          {t('actionDelete')}
                        </button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="nh-row">
              <label htmlFor="cat-perpage">
                {t('perPage')}{' '}
                <select
                  id="cat-perpage"
                  value={limit}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setLimit(next);
                    setPage(1);
                    syncUrl({ limit: next, page: 1 });
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Paginator
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              limit={limit}
              onPage={(next) => {
                setPage(next);
                syncUrl({ page: next });
              }}
            />
          </>
        )}
      </section>

      {confirm && !isReviewer && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage', { label: confirm.label })}
          confirmLabel={t('actionDelete')}
          onConfirm={() => {
            const row = confirm;
            setConfirm(null);
            void remove(row);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {discard && !isReviewer && (
        <ConfirmDialog
          title={t('discardTitle')}
          message={t('discardMessage')}
          confirmLabel={t('leave')}
          onConfirm={() => {
            const next = discard.next;
            setDiscard(null);
            if (next) seedEdit(next);
            else resetForm();
          }}
          onCancel={() => setDiscard(null)}
        />
      )}
    </main>
  );
}
