'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
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
  const { apiFetch } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AuthorForm>(EMPTY_AUTHOR_FORM);
  const [editing, setEditing] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthorFormError>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [confirm, setConfirm] = useState<AuthorRow | null>(null);

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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!runValidation()) return;
    setBusy(true);
    try {
      const res = await createAuthor(apiFetch, payload());
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === 'slug_taken') {
          setFieldErrors({ slug: 'slug' });
          document.getElementById('au-slug')?.focus();
        } else {
          setError(`HTTP ${res.status}`);
        }
        return;
      }
      setForm(EMPTY_AUTHOR_FORM);
      setFieldErrors({});
      setTouched(false);
      notify(t('created'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: AuthorRow) {
    const es = row.translations.find((tr) => tr.locale === 'es');
    const en = row.translations.find((tr) => tr.locale === 'en');
    setEditing(row.id);
    setFieldErrors({});
    setTouched(false);
    setForm({
      slug: row.slug,
      esName: es?.name ?? '',
      esBio: es?.bio ?? '',
      enName: en?.name ?? '',
      enBio: en?.bio ?? '',
    });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !runValidation()) return;
    setBusy(true);
    try {
      const res = await updateAuthor(apiFetch, editing, payload());
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        if (body?.code === 'slug_taken') {
          setFieldErrors({ slug: 'slug' });
          document.getElementById('au-slug')?.focus();
        } else {
          setError(`HTTP ${res.status}`);
        }
        return;
      }
      setEditing(null);
      setForm(EMPTY_AUTHOR_FORM);
      setFieldErrors({});
      setTouched(false);
      notify(t('saved'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AuthorRow) {
    const res = await removeAuthor(apiFetch, row.id);
    if (!res.ok) {
      if (res.status === 409) {
        // opinions.author is RESTRICT; articles.author is SET NULL.
        notify(t('blockedOpinions'), 'err');
        return;
      }
      setError(`HTTP ${res.status}`);
      return;
    }
    notify(t('saved'), 'ok');
    await load();
  }

  const set = (key: keyof AuthorForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  function fieldMessage(key: keyof AuthorFormError): string | null {
    const err = touched ? fieldErrors[key] : undefined;
    if (!err) return null;
    if (err === 'slug') return t('invalidSlug');
    return t('required');
  }

  function textField(key: 'slug' | 'esName' | 'enName', id: string, label: string) {
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
    ? items.filter((row) => `${nameOf(row)} ${nameOf(row, 'en')} ${row.slug}`.toLowerCase().includes(query.trim().toLowerCase()))
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

      <section className="nh-card" aria-label={editing ? t('edit') : t('new')}>
        <h2>{editing ? t('edit') : t('new')}</h2>
        <form onSubmit={editing ? saveEdit : create} noValidate>
          {textField('slug', 'au-slug', t('fieldSlug'))}
          {textField('esName', 'au-esName', t('fieldNameEs'))}
          <div className="nh-field">
            <label htmlFor="au-esBio">{t('fieldBioEs')}</label>
            <textarea id="au-esBio" value={form.esBio} onChange={set('esBio')} rows={2} />
          </div>
          {textField('enName', 'au-enName', t('fieldNameEn'))}
          <div className="nh-field">
            <label htmlFor="au-enBio">{t('fieldBioEn')}</label>
            <textarea id="au-enBio" value={form.enBio} onChange={set('enBio')} rows={2} />
          </div>
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
                  setForm(EMPTY_AUTHOR_FORM);
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
                  <th>{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>{nameOf(row)}</td>
                    <td>
                      <span className="nh-muted">{row.slug}</span>
                    </td>
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
    </main>
  );
}
