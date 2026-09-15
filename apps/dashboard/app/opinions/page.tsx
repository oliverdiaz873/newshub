'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUiPrefs } from '@/lib/ui-prefs';
import { useToast } from '@/components/Toasts';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RequireAuth } from '@/components/RequireAuth';
import { ConfirmDialog } from '@/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/States';
import { Paginator, Table } from '@/components/Table';
import { LoadingFallback } from '@/components/LoadingFallback';
import { actionsFor, type EditorialAction } from '@/lib/transitions';
import { toLocalLabel, toUtcLabel } from '@/lib/schedule';

interface ListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledAt?: string | null;
  updatedAt?: string;
}

interface AuthorOption {
  id: string;
  label: string;
}

type RowAction = Exclude<EditorialAction, 'delete'> | 'delete';

const PAGE_SIZE_KEY = 'newshub-pagesize-opinions';
const PAGE_SIZES = [10, 20, 50];

function OpinionsBody() {
  const t = useTranslations('opinions');
  const ta = useTranslations('articles');
  const ts = useTranslations('scheduling');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiFetch, user } = useAuth();
  const isReviewer = user?.role === 'reviewer';
  const { previewLang } = useUiPrefs();
  const { notify } = useToast();

  const editorialLocale = previewLang === 'en-first' ? 'en' : 'es';

  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? 'all');
  const [authorFilter, setAuthorFilter] = useState(() => searchParams.get('author') ?? '');
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [queryInput, setQueryInput] = useState(() => searchParams.get('q') ?? '');
  const [sort, setSort] = useState(() => searchParams.get('sort') ?? 'publishedAt:desc');
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? 1) || 1);
  const [limit, setLimit] = useState(() => {
    const fromUrl = Number(searchParams.get('limit') ?? 0);
    if (fromUrl === 10 || fromUrl === 20 || fromUrl === 50) return fromUrl;
    if (typeof window !== 'undefined') {
      const stored = Number(localStorage.getItem(PAGE_SIZE_KEY) ?? 0);
      if (stored === 10 || stored === 20 || stored === 50) return stored;
    }
    return 20;
  });

  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: RowAction; item: ListItem } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const paramsKey = useMemo(
    () =>
      JSON.stringify({ statusFilter, authorFilter, query, sort, page, limit, editorialLocale, reloadToken }),
    [statusFilter, authorFilter, query, sort, page, limit, editorialLocale, reloadToken],
  );

  const syncUrl = useCallback(
    (patch: Partial<{ status: string; author: string; q: string; sort: string; page: number; limit: number }>) => {
      const params = new URLSearchParams();
      const next = {
        status: patch.status ?? statusFilter,
        author: patch.author ?? authorFilter,
        q: patch.q ?? query,
        sort: patch.sort ?? sort,
        page: patch.page ?? page,
        limit: patch.limit ?? limit,
      };
      if (next.status !== 'all') params.set('status', next.status);
      if (next.author) params.set('author', next.author);
      if (next.q) params.set('q', next.q);
      if (next.sort !== 'publishedAt:desc') params.set('sort', next.sort);
      if (next.page !== 1) params.set('page', String(next.page));
      if (next.limit !== 20) params.set('limit', String(next.limit));
      const qs = params.toString();
      router.replace(qs ? `/opinions?${qs}` : '/opinions', { scroll: false });
    },
    [statusFilter, authorFilter, query, sort, page, limit, router],
  );

  function resetPage(patch: Parameters<typeof syncUrl>[0]) {
    syncUrl({ ...patch, page: 1 });
    setPage(1);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (queryInput !== query) {
        setQuery(queryInput);
        resetPage({ q: queryInput });
      }
    }, 300);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  useEffect(() => {
    const onGlobal = (event: Event) => {
      const value = (event as CustomEvent<string>).detail ?? '';
      setQueryInput(value);
    };
    window.addEventListener('nh:global-search', onGlobal);
    return () => window.removeEventListener('nh:global-search', onGlobal);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const auths = await apiFetch('/authors');
        if (!auths.ok) return;
        const json = (await auths.json()) as Array<{
          slug: string;
          translations: Array<{ locale: string; name: string }>;
        }>;
        setAuthors(
          json.map((a) => ({
            id: a.slug,
            label: `${a.translations.find((tr) => tr.locale === 'es')?.name ?? a.slug} (${a.slug})`,
          })),
        );
      } catch {
        // Author filter stays usable-empty.
      }
    })();
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = JSON.parse(paramsKey) as {
        statusFilter: string;
        authorFilter: string;
        query: string;
        sort: string;
        page: number;
        limit: number;
        editorialLocale: string;
      };
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          locale: state.editorialLocale,
          limit: String(state.limit),
          page: String(state.page),
          sort: state.sort,
        });
        if (state.statusFilter !== 'all') params.set('status', state.statusFilter);
        if (state.authorFilter) params.set('author', state.authorFilter);
        if (state.query.trim()) params.set('q', state.query.trim());
        const res = await apiFetch(`/editorial/opinions?${params.toString()}`);
        if (cancelled) return;
        if (res.status === 401) {
          setError(tc('sessionRequired'));
          setItems([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: ListItem[]; meta: { total: number; totalPages: number } };
        setItems(json.data);
        setTotal(json.meta.total);
        setTotalPages(json.meta.totalPages);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : tc('networkError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, paramsKey, tc]);

  async function runAction(action: RowAction, item: ListItem) {
    if (action === 'delete') {
      const res = await apiFetch(`/opinions/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('saved'), 'ok');
      setReloadToken((token) => token + 1);
      return;
    }
    const res = await apiFetch(`/opinions/${item.id}/${action}`, {
      method: 'POST',
      ...(action === 'reject' ? { body: JSON.stringify({}) } : {}),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      notify(body?.code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`, 'err');
      return;
    }
    notify(action === 'reject' ? t('rejectedOk') : action === 'publish' ? t('publishedOk') : t('saved'), 'ok');
    setReloadToken((token) => token + 1);
  }

  function actionLabel(action: RowAction): string {
    if (action === 'publish') return ta('actionPublish');
    if (action === 'unpublish') return ta('actionUnpublish');
    if (action === 'archive') return ta('actionArchive');
    if (action === 'restore') return ta('actionRestore');
    if (action === 'reject') return ta('actionReject');
    return ta('actionDelete');
  }

  function confirmCopy(action: RowAction, item: ListItem): { title: string; message: string } {
    if (action === 'delete') return { title: t('deleteTitle'), message: t('deleteMessage', { title: item.title }) };
    if (action === 'reject') return { title: t('rejectTitle'), message: t('rejectMessage', { title: item.title }) };
    return { title: t('archiveTitle'), message: t('archiveMessage', { title: item.title }) };
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <div className="nh-row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('title')}</h1>
        {!isReviewer && (
          <Link className="nh-btn primary" href="/opinions/new">
            {t('new')}
          </Link>
        )}
      </div>

      <section className="nh-card" aria-label={t('searchLabel')}>
        <div className="nh-field">
          <label htmlFor="opinions-q">{t('searchLabel')}</label>
          <input
            id="opinions-q"
            type="search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            data-f="q"
          />
          <span className="nh-muted">{t('searchHint')}</span>
        </div>
        <div className="nh-row">
          <label>
            {t('status')}{' '}
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                resetPage({ status: event.target.value });
              }}
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="draft">{ta('statusDraft')}</option>
              <option value="review">{ta('statusReview')}</option>
              <option value="published">{ta('statusPublished')}</option>
              <option value="archived">{ta('statusArchived')}</option>
            </select>
          </label>
          <label>
            {t('author')}{' '}
            <select
              value={authorFilter}
              onChange={(event) => {
                setAuthorFilter(event.target.value);
                resetPage({ author: event.target.value });
              }}
            >
              <option value="">{t('allAuthors')}</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('sort')}{' '}
            <select
              value={sort}
              aria-label={t('sort')}
              onChange={(event) => {
                setSort(event.target.value);
                resetPage({ sort: event.target.value });
              }}
            >
              <option value="publishedAt:desc">{t('sortNewest')}</option>
              <option value="publishedAt:asc">{t('sortOldest')}</option>
            </select>
          </label>
          <label>
            {t('perPage')}{' '}
            <select
              value={limit}
              onChange={(event) => {
                const next = Number(event.target.value);
                try {
                  localStorage.setItem(PAGE_SIZE_KEY, String(next));
                } catch {
                  // ignore
                }
                setLimit(next);
                resetPage({ limit: next });
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
      </section>

      {error && <ErrorState message={error} />}

      {loading ? (
        <Skeleton lines={6} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Table label={t('title')}>
            <thead>
              <tr>
                <th>{t('colTitle')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colUpdated')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} data-row={item.id} data-status={item.status}>
                  <td>
                    <Link href={`/opinions/${item.id}`}>{item.title}</Link>
                    <div className="nh-muted">{item.slug}</div>
                    {item.scheduledAt && (
                      <div className="nh-muted" title={toUtcLabel(item.scheduledAt)}>
                        <span aria-hidden="true">⏱</span>{' '}
                        <span className="nh-sr-only">{ts('badge')}</span> {toLocalLabel(item.scheduledAt)}
                      </div>
                    )}
                  </td>
                  <td>{item.status}</td>
                  <td className="nh-muted">{item.updatedAt ?? ''}</td>
                  <td>
                    <div className="nh-row">
                      <Link className="nh-btn" href={`/opinions/${item.id}`}>
                        {ta('actionEdit')}
                      </Link>
                      {(isReviewer ? actionsFor(item.status).filter((a) => a !== 'delete') : actionsFor(item.status)).map((action) =>
                        action === 'delete' || action === 'archive' || action === 'reject' ? (
                          <button
                            key={action}
                            className={action === 'delete' ? 'nh-btn danger' : 'nh-btn'}
                            type="button"
                            onClick={() => setConfirm({ action, item })}
                          >
                            {actionLabel(action)}
                          </button>
                        ) : (
                          <button
                            key={action}
                            className="nh-btn"
                            type="button"
                            onClick={() => void runAction(action, item)}
                          >
                            {actionLabel(action)}
                          </button>
                        ),
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPage={(next) => {
              setPage(next);
              syncUrl({ page: next });
            }}
          />
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirmCopy(confirm.action, confirm.item).title}
          message={confirmCopy(confirm.action, confirm.item).message}
          confirmLabel={confirm.action === 'delete' ? ta('actionDelete') : ta('confirm')}
          onConfirm={() => {
            const { action, item } = confirm;
            setConfirm(null);
            void runAction(action, item);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}

export default function OpinionsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <OpinionsBody />
      </Suspense>
    </RequireAuth>
  );
}
