'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useDirtyGuard } from '@/shared/lib/dirty';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Paginator, Table } from '@/shared/components/Table';
import { createAuthor, listAuthors, removeAuthor, updateAuthor } from '../services/authorService';
import type { AuthorForm, AuthorFormError, AuthorRow } from '../types';
import { EMPTY_AUTHOR_FORM, validateAuthorForm } from '../validate';

const PAGE_SIZES = [10, 20, 50];

function nameOf(row: AuthorRow, locale: 'es' | 'en' = 'es'): string {
  return row.translations.find((tr) => tr.locale === locale)?.name ?? row.slug;
}

export function AuthorManager() {
  const t = useTranslations('authors');
  const tc = useTranslations('common');
  const { apiFetch, user } = useAuth();
  const { notify } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Inc2: reviewer can read the editorial list but the API rejects writes
  // (admin/editor only). Mirror CategoryManager's isReviewer pattern: hide the
  // write UI instead of letting the reviewer hit a raw HTTP 403.
  const isReviewer = user?.role === 'reviewer';

  const [items, setItems] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AuthorForm>(EMPTY_AUTHOR_FORM);
  // Inc3: dirty guard over the inline form (mirrors CategoryManager's
  // useDirtyGuard: visual flag + beforeunload + discard confirm).
  const { dirty: formDirty, reset: resetDirty } = useDirtyGuard(form);
  const [editing, setEditing] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthorFormError>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1) || 1);
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get('limit') ?? 0);
    return fromUrl === 10 || fromUrl === 20 || fromUrl === 50 ? fromUrl : 20;
  });
  const [confirm, setConfirm] = useState<AuthorRow | null>(null);
  // Inc3: pending discard (Cancel button or row-switch while dirty).
  const [discard, setDiscard] = useState<{ next: AuthorRow | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // No public surface and no server pagination by design; the editorial
      // list is fetched whole and filtered/paged client-side.
      const res = await listAuthors(apiFetch);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as AuthorRow[];
      setItems(rows.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))));
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Inc4: back/forward support — URL is the source of truth for q/page/limit.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery(searchParams.get('q') ?? '');
    setPage(Number(searchParams.get('page') ?? 1) || 1);
    const fromUrl = Number(searchParams.get('limit') ?? 0);
    setLimit(fromUrl === 10 || fromUrl === 20 || fromUrl === 50 ? fromUrl : 20);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  // Inc4: write-through URL sync (defaults omitted, like CategoryManager).
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
      router.replace(qs ? `/authors?${qs}` : '/authors', { scroll: false });
    },
    [router, query, page, limit],
  );

  function payload() {
    const translations = [{ locale: 'es', name: form.esName.trim(), bio: form.esBio.trim() || null }];
    if (form.enName.trim()) {
      translations.push({ locale: 'en', name: form.enName.trim(), bio: form.enBio.trim() || null });
    }
    return { slug: form.slug.trim(), translations };
  }

  function runValidation(): boolean {
    const errors = validateAuthorForm(form);
    setFieldErrors(errors);
    setTouched(true);
    const order: Array<keyof AuthorForm> = ['slug', 'esName', 'enName'];
    const first = order.find((key) => errors[key as keyof AuthorFormError]);
    if (first) {
      const id = first === 'esName' ? 'au-esName' : first === 'enName' ? 'au-enName' : 'au-slug';
      document.getElementById(id)?.focus();
      return false;
    }
    return Object.keys(errors).length === 0;
  }

  // Inc1: veracious API errors. The API returns RFC7807 codes (problem.filter:
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
    if (code === 'not_found') return t('authorNotFound');
    if (code === 'validation_failed' || code === 'bad_request') return t('apiValidationFailed');
    return tc('httpError', { status });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (isReviewer) return;
    if (!runValidation()) return;
    setBusy(true);
    try {
      const res = await createAuthor(apiFetch, payload());
      if (!res.ok) {
        const code = await readCode(res);
        if (code === 'slug_taken') {
          setFieldErrors({ slug: 'taken' });
          document.getElementById('au-slug')?.focus();
        } else {
          setError(apiErrorMessage(res.status, code));
        }
        return;
      }
      setForm(EMPTY_AUTHOR_FORM);
      setFieldErrors({});
      setTouched(false);
      resetDirty(EMPTY_AUTHOR_FORM);
      notify(t('created'), 'ok');
      await load();
      focusListTitle();
    } finally {
      setBusy(false);
    }
  }

  // Inc3: shared form reset (keeps the dirty baseline in sync).
  function resetForm() {
    setEditing(null);
    setForm(EMPTY_AUTHOR_FORM);
    setFieldErrors({});
    setTouched(false);
    resetDirty(EMPTY_AUTHOR_FORM);
  }

  // Inc3: return focus to the list after a successful write/delete so
  // keyboard + screen-reader users land on the updated content. Toasts
  // already announce via role=status (ok) / role=alert (err).
  function focusListTitle() {
    document.getElementById('au-list-title')?.focus();
  }

  function fillForm(row: AuthorRow) {
    const es = row.translations.find((tr) => tr.locale === 'es');
    const en = row.translations.find((tr) => tr.locale === 'en');
    const next: AuthorForm = {
      slug: row.slug,
      esName: es?.name ?? '',
      esBio: es?.bio ?? '',
      enName: en?.name ?? '',
      enBio: en?.bio ?? '',
    };
    setEditing(row.id);
    setFieldErrors({});
    setTouched(false);
    setForm(next);
    resetDirty(next);
  }

  function startEdit(row: AuthorRow) {
    if (isReviewer) return;
    // Inc3: don't silently wipe unsaved form input when switching rows.
    if (formDirty) {
      setDiscard({ next: row });
      return;
    }
    fillForm(row);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (isReviewer) return;
    if (!editing || !runValidation()) return;
    setBusy(true);
    try {
      const res = await updateAuthor(apiFetch, editing, payload());
      if (!res.ok) {
        const code = await readCode(res);
        if (code === 'slug_taken') {
          setFieldErrors({ slug: 'taken' });
          document.getElementById('au-slug')?.focus();
        } else {
          setError(apiErrorMessage(res.status, code));
        }
        return;
      }
      setEditing(null);
      setForm(EMPTY_AUTHOR_FORM);
      setFieldErrors({});
      setTouched(false);
      resetDirty(EMPTY_AUTHOR_FORM);
      notify(t('saved'), 'ok');
      await load();
      focusListTitle();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AuthorRow) {
    if (isReviewer) return;
    const res = await removeAuthor(apiFetch, row.id);
    if (!res.ok) {
      if (res.status === 409) {
        // opinions.author is RESTRICT; articles.author is SET NULL.
        notify(t('blockedOpinions'), 'err');
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

  const set = (key: keyof AuthorForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function fieldMessage(key: keyof AuthorFormError): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    if (err === 'taken') return t('slugTaken');
    if (err === 'slug') return t('invalidSlug');
    return t('required');
  }

  function textField(key: 'slug' | 'esName' | 'enName', id: string, label: string, required = false) {
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
          // Deterministic accessible name: the visible required marker (`*`)
          // leaks into some engines' name computation, breaking exact matches.
          aria-label={label}
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

  // Inc4: filter matches name (ES/EN) + slug + bio (ES/EN).
  const filtered = query.trim()
    ? items.filter((row) =>
        `${nameOf(row)} ${nameOf(row, 'en')} ${row.slug} ${row.translations.map((tr) => tr.bio ?? '').join(' ')}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * limit, safePage * limit);

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>
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
          {textField('slug', 'au-slug', t('fieldSlug'), true)}
          {textField('esName', 'au-esName', t('fieldNameEs'), true)}
          <div className="nh-field">
            <label htmlFor="au-esBio">{t('fieldBioEs')}</label>
            <textarea id="au-esBio" value={form.esBio} onChange={set('esBio')} rows={2} disabled={busy} />
          </div>
          {textField('enName', 'au-enName', t('fieldNameEn'))}
          <div className="nh-field">
            <label htmlFor="au-enBio">{t('fieldBioEn')}</label>
            <textarea id="au-enBio" value={form.enBio} onChange={set('enBio')} rows={2} disabled={busy} />
          </div>
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
                  // Inc3: Cancel with unsaved input asks first (no silent wipe).
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
        <h2 id="au-list-title" tabIndex={-1}>
          {t('title')}
        </h2>
        <p className="nh-muted">{t('countsDeferred')}</p>
        <div className="nh-field">
          <label htmlFor="au-q">{t('searchLabel')}</label>
          <input
            id="au-q"
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
                  <th>{t('colName')}</th>
                  <th>{t('colSlug')}</th>
                  <th>{t('colLanguages')}</th>
                  <th>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const name = nameOf(row);
                  const bio = row.translations.find((tr) => tr.locale === 'es')?.bio ?? '';
                  const initials = name
                    .split(/\s+/)
                    .map((part) => part.slice(0, 1))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                  <tr
                    key={row.id}
                    className={editing === row.id ? 'is-selected' : undefined}
                    aria-current={editing === row.id ? true : undefined}
                  >
                    <td>
                      <span className="nh-user-chip">
                        <span className="nh-avatar" aria-hidden="true">
                          {initials}
                        </span>
                        <span>{name}</span>
                      </span>
                      {bio && <div className="nh-muted">{bio}</div>}
                    </td>
                    <td>
                      <span className="nh-muted">{row.slug}</span>
                    </td>
                    <td>
                      {row.translations.some((tr) => tr.locale === 'es') && (
                        <span className="nh-badge">ES</span>
                      )}{' '}
                      {row.translations.some((tr) => tr.locale === 'en') && (
                        <span className="nh-badge">EN</span>
                      )}
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
                  );
                })}
              </tbody>
            </Table>
            <div className="nh-row">
              <label htmlFor="au-perpage">
                {t('perPage')}{' '}
                <select
                  id="au-perpage"
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
          message={t('deleteMessage', { name: nameOf(confirm) })}
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
            if (next) fillForm(next);
            else resetForm();
          }}
          onCancel={() => setDiscard(null)}
        />
      )}
    </main>
  );
}
