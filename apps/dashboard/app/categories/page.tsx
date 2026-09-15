'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useUiPrefs } from '@/shared/lib/ui-prefs';
import { useToast } from '@/shared/components/Toasts';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ConfirmDialog } from '@/shared/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { Paginator, Table } from '@/shared/components/Table';
import { CONTENT_SLUG_PATTERN } from '@/features/editorial-shared/lib/validate-content';

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
  articleCount: number;
}

interface CategoryForm {
  sort: string;
  esSlug: string;
  esLabel: string;
  esDesc: string;
  enSlug: string;
  enLabel: string;
}

const EMPTY: CategoryForm = { sort: '0', esSlug: '', esLabel: '', esDesc: '', enSlug: '', enLabel: '' };
const PAGE_SIZES = [10, 20, 50];

type FormError = Partial<Record<'sort' | 'esSlug' | 'esLabel' | 'enSlug' | 'enLabel', 'required' | 'slug' | 'number'>>;

function validateForm(form: CategoryForm): FormError {
  const errors: FormError = {};
  if (form.sort.trim() !== '' && !/^-?\d+$/.test(form.sort.trim())) errors.sort = 'number';
  if (!form.esSlug.trim()) errors.esSlug = 'required';
  else if (!CONTENT_SLUG_PATTERN.test(form.esSlug.trim())) errors.esSlug = 'slug';
  if (!form.esLabel.trim()) errors.esLabel = 'required';
  if (form.enSlug.trim() || form.enLabel.trim()) {
    if (!form.enSlug.trim()) errors.enSlug = 'required';
    else if (!CONTENT_SLUG_PATTERN.test(form.enSlug.trim())) errors.enSlug = 'slug';
    if (!form.enLabel.trim()) errors.enLabel = 'required';
  }
  return errors;
}

function CategoriesBody() {
  const t = useTranslations('categories');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const { previewLang } = useUiPrefs();
  const { notify } = useToast();

  const editorialLocale = previewLang === 'en-first' ? 'en' : 'es';

  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormError>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/editorial/categories?locale=${editorialLocale}&limit=100`);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: CategoryRow[] };
      setItems(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, editorialLocale, tc]);

  useEffect(() => {
    // Single catalog fetch per mount/locale (client filter + pager below).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
    const errors = validateForm(form);
    setFieldErrors(errors);
    setTouched(true);
    const order: Array<keyof CategoryForm> = ['sort', 'esSlug', 'esLabel', 'enSlug', 'enLabel'];
    const first = order.find((key) => errors[key as keyof FormError]);
    if (first) {
      document.getElementById(`cat-${first}`)?.focus();
      return false;
    }
    return Object.keys(errors).length === 0;
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!runValidation()) return;
    setBusy(true);
    try {
      const res = await apiFetch('/categories?locale=es', { method: 'POST', body: JSON.stringify(payload()) });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === 'slug_taken') {
          setFieldErrors({ esSlug: 'slug' });
          document.getElementById('cat-esSlug')?.focus();
        } else {
          setError(`HTTP ${res.status}`);
        }
        return;
      }
      setForm(EMPTY);
      setFieldErrors({});
      setTouched(false);
      notify(t('created'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: CategoryRow) {
    setEditing(row.id);
    setFieldErrors({});
    setTouched(false);
    setForm({ ...EMPTY, sort: String(row.sort), esSlug: row.slug, esLabel: row.label, esDesc: row.description ?? '' });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !runValidation()) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/categories/${editing}?locale=es`, {
        method: 'PATCH',
        body: JSON.stringify(payload()),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === 'slug_taken') {
          setFieldErrors({ esSlug: 'slug' });
          document.getElementById('cat-esSlug')?.focus();
        } else {
          setError(`HTTP ${res.status}`);
        }
        return;
      }
      setEditing(null);
      setForm(EMPTY);
      setFieldErrors({});
      setTouched(false);
      notify(t('saved'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: CategoryRow) {
    const res = await apiFetch(`/categories/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      if (res.status === 409) {
        notify(t('blockedArticles'), 'err');
        return;
      }
      setError(`HTTP ${res.status}`);
      return;
    }
    notify(t('saved'), 'ok');
    await load();
  }

  const set = (key: keyof CategoryForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function fieldMessage(key: keyof FormError): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    if (err === 'slug') return t('invalidSlug');
    return t('required');
  }

  function textField(key: 'esSlug' | 'esLabel' | 'enSlug' | 'enLabel', label: string) {
    const id = `cat-${key}`;
    const message = fieldMessage(key);
    return (
      <div className="nh-field">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          value={form[key]}
          onChange={set(key)}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-err` : undefined}
        />
        {message && (
          <span id={`${id}-err`} className="nh-muted" role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  const filtered = query.trim()
    ? items.filter((row) => `${row.label} ${row.slug}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * limit, safePage * limit);

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <section className="nh-card" aria-label={editing ? t('edit') : t('new')}>
        <h2>{editing ? t('edit') : t('new')}</h2>
        <form onSubmit={editing ? saveEdit : create} noValidate>
          <div className="nh-field">
            <label htmlFor="cat-sort">{t('fieldSort')}</label>
            <input id="cat-sort" value={form.sort} onChange={set('sort')} inputMode="numeric" aria-invalid={touched && fieldErrors.sort ? true : undefined} />
            {touched && fieldErrors.sort && (
              <span className="nh-muted" role="alert">
                {t('required')}
              </span>
            )}
          </div>
          {textField('esSlug', t('fieldSlugEs'))}
          {textField('esLabel', t('fieldLabelEs'))}
          <div className="nh-field">
            <label htmlFor="cat-esDesc">{t('fieldDescEs')}</label>
            <textarea id="cat-esDesc" value={form.esDesc} onChange={set('esDesc')} rows={2} />
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
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY);
                  setFieldErrors({});
                  setTouched(false);
                }}
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="nh-card" aria-label={t('title')}>
        <h2>{t('title')}</h2>
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
                  <th>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td>
                      <span className="nh-muted">{row.slug}</span>
                    </td>
                    <td>{row.sort}</td>
                    <td>{row.articleCount}</td>
                    <td>
                      <div className="nh-row">
                        <button className="nh-btn" type="button" onClick={() => startEdit(row)}>
                          {t('actionEdit')}
                        </button>
                        <button className="nh-btn danger" type="button" onClick={() => setConfirm(row)}>
                          {t('actionDelete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="nh-row">
              <label>
                {t('perPage')}{' '}
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
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
            <Paginator page={safePage} totalPages={totalPages} total={filtered.length} limit={limit} onPage={setPage} />
          </>
        )}
      </section>

      {confirm && (
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
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <RequireAuth>
      <CategoriesBody />
    </RequireAuth>
  );
}
