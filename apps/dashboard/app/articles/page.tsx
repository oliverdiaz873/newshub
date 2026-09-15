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
  categorySlug: string;
  isBreaking: boolean;
  isFeatured: boolean;
  scheduledAt?: string | null;
  updatedAt?: string;
}

interface FilterOption {
  id: string;
  label: string;
}

interface BulkResult {
  id: string;
  ok: boolean;
  code?: string;
}

type BulkAction = EditorialAction;

const PAGE_SIZE_KEY = 'newshub-pagesize-articles';
const PAGE_SIZES = [10, 20, 50];

function ArticlesBody() {
  const t = useTranslations('articles');
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
  const [curationFilter, setCurationFilter] = useState(() => searchParams.get('curation') ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get('category') ?? '');
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
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [authors, setAuthors] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const raw = searchParams.get('select');
    return new Set(raw ? raw.split(',').filter(Boolean) : []);
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [confirm, setConfirm] = useState<{ action: BulkAction; ids: string[]; title: string; message: string } | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const paramsKey = useMemo(
    () =>
      JSON.stringify({
        statusFilter,
        curationFilter,
        categoryFilter,
        authorFilter,
        query,
        sort,
        page,
        limit,
        editorialLocale,
        reloadToken,
      }),
    [statusFilter, curationFilter, categoryFilter, authorFilter, query, sort, page, limit, editorialLocale, reloadToken],
  );

  const syncUrl = useCallback(
    (patch: Partial<{ status: string; curation: string; category: string; author: string; q: string; sort: string; page: number; limit: number }>) => {
      const params = new URLSearchParams();
      const next = {
        status: patch.status ?? statusFilter,
        curation: patch.curation ?? curationFilter,
        category: patch.category ?? categoryFilter,
        author: patch.author ?? authorFilter,
        q: patch.q ?? query,
        sort: patch.sort ?? sort,
        page: patch.page ?? page,
        limit: patch.limit ?? limit,
      };
      if (next.status !== 'all') params.set('status', next.status);
      if (next.curation !== 'all') params.set('curation', next.curation);
      if (next.category) params.set('category', next.category);
      if (next.author) params.set('author', next.author);
      if (next.q) params.set('q', next.q);
      if (next.sort !== 'publishedAt:desc') params.set('sort', next.sort);
      if (next.page !== 1) params.set('page', String(next.page));
      if (next.limit !== 20) params.set('limit', String(next.limit));
      const select = [...selected];
      if (select.length > 0) params.set('select', select.join(','));
      const qs = params.toString();
      router.replace(qs ? `/articles?${qs}` : '/articles', { scroll: false });
    },
    [statusFilter, curationFilter, categoryFilter, authorFilter, query, sort, page, limit, selected, router],
  );

  function resetPage(patch: Parameters<typeof syncUrl>[0]) {
    syncUrl({ ...patch, page: 1 });
    setPage(1);
  }

  // Debounced search input (300ms, mockup pattern).
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

  // Global topbar search proxies into this view.
  useEffect(() => {
    const onGlobal = (event: Event) => {
      const value = (event as CustomEvent<string>).detail ?? '';
      setQueryInput(value);
    };
    window.addEventListener('nh:global-search', onGlobal);
    return () => window.removeEventListener('nh:global-search', onGlobal);
  }, []);

  // Reference lists load once (filters only â€” never the article list itself).
  useEffect(() => {
    void (async () => {
      try {
        const [cats, auths] = await Promise.all([
          apiFetch('/editorial/categories?locale=es&limit=100'),
          apiFetch('/authors'),
        ]);
        if (cats.ok) {
          const json = (await cats.json()) as { data: Array<{ id: string; slug: string; label: string }> };
          setCategories(json.data.map((c) => ({ id: c.slug, label: `${c.label} (${c.slug})` })));
        }
        if (auths.ok) {
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
        }
      } catch {
        // Filters stay usable-empty; the list reports its own errors.
      }
    })();
  }, [apiFetch]);

  // Single article fetch per param state (no double fetch by design).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = JSON.parse(paramsKey) as {
        statusFilter: string;
        curationFilter: string;
        categoryFilter: string;
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
        if (state.curationFilter === 'breaking') params.set('breaking', 'true');
        if (state.curationFilter === 'featured') params.set('featured', 'true');
        if (state.categoryFilter) params.set('category', state.categoryFilter);
        if (state.authorFilter) params.set('author', state.authorFilter);
        if (state.query.trim()) params.set('q', state.query.trim());
        const res = await apiFetch(`/editorial/articles?${params.toString()}`);
        if (cancelled) return;
        if (res.status === 401) {
          setError(tc('sessionRequired'));
          setItems([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          data: ListItem[];
          meta: { total: number; totalPages: number };
        };
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

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => {
      const visible = items.map((item) => item.id);
      const allSelected = visible.length > 0 && visible.every((id) => current.has(id));
      const next = new Set(current);
      if (allSelected) visible.forEach((id) => next.delete(id));
      else visible.forEach((id) => next.add(id));
      return next;
    });
  }

  function summarize(action: BulkAction, results: BulkResult[]) {
    const ok = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) {
      notify(t('bulkSummary', { ok, failed: 0 }), 'ok');
      return;
    }
    const codes = [...new Set(failed.map((r) => r.code ?? 'failed'))].join(', ');
    notify(`${t('bulkSummary', { ok, failed: failed.length })}. ${t('bulkFailedCodes', { codes })}`, 'err');
  }

  async function runBulk(action: BulkAction, ids: string[]) {
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await apiFetch('/articles/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, ids }),
      });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      const json = (await res.json()) as { results: BulkResult[] };
      summarize(action, json.results);
      setSelected(new Set());
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  async function runSingle(action: BulkAction, item: ListItem) {
    if (action === 'delete') {
      const res = await apiFetch(`/articles/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      setSelected((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      reload();
      return;
    }
    const res = await apiFetch(`/articles/${item.id}/${action}`, {
      method: 'POST',
      ...(action === 'reject' ? { body: JSON.stringify({}) } : {}),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      notify(body?.code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`, 'err');
      return;
    }
    if (action === 'reject') notify(t('rejectedOk'), 'ok');
    reload();
  }

  function reload() {
    // Re-trigger the single list fetch without touching URL params.
    setReloadToken((token) => token + 1);
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <div className="nh-row" style={{ justifyContent: 'space-between' }}>
        <h1>{t('title')}</h1>
        {!isReviewer && (
          <Link className="nh-btn primary" href="/articles/new">
            {t('new')}
          </Link>
        )}
      </div>

      <section className="nh-card" aria-label={t('searchLabel')}>
        <div className="nh-field">
          <label htmlFor="articles-q">{t('searchLabel')}</label>
          <input
            id="articles-q"
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
              <option value="draft">{t('statusDraft')}</option>
              <option value="review">{t('statusReview')}</option>
              <option value="published">{t('statusPublished')}</option>
              <option value="archived">{t('statusArchived')}</option>
            </select>
          </label>
          <label>
            {t('curation')}{' '}
            <select
              value={curationFilter}
              onChange={(event) => {
                setCurationFilter(event.target.value);
                resetPage({ curation: event.target.value });
              }}
            >
              <option value="all">{t('allCuration')}</option>
              <option value="featured">{t('fieldFeatured')}</option>
              <option value="breaking">{t('fieldBreaking')}</option>
            </select>
          </label>
          <label>
            {t('category')}{' '}
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                resetPage({ category: event.target.value });
              }}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
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

      {selectedIds.length > 0 && (
        <section className="nh-card" aria-label={t('selected', { count: selectedIds.length })}>
          <div className="nh-row">
            <strong>{t('selected', { count: selectedIds.length })}</strong>
            <button className="nh-btn" type="button" disabled={bulkBusy} onClick={() => void runBulk('publish', selectedIds)}>
              {t('bulkPublish')}
            </button>
            <button className="nh-btn" type="button" disabled={bulkBusy} onClick={() => void runBulk('unpublish', selectedIds)}>
              {t('bulkUnpublish')}
            </button>
            <button
              className="nh-btn"
              type="button"
              disabled={bulkBusy}
              onClick={() =>
                setConfirm({
                  action: 'archive',
                  ids: selectedIds,
                  title: t('archiveTitle'),
                  message: t('archiveBulkMessage', { count: selectedIds.length }),
                })
              }
            >
              {t('bulkArchive')}
            </button>
            <button
              className="nh-btn danger"
              type="button"
              disabled={bulkBusy}
              onClick={() =>
                setConfirm({
                  action: 'reject',
                  ids: selectedIds,
                  title: t('rejectTitle'),
                  message: t('rejectBulkMessage', { count: selectedIds.length }),
                })
              }
            >
              {t('actionReject')}
            </button>
            {!isReviewer && (
              <button
                className="nh-btn danger"
                type="button"
                disabled={bulkBusy}
                onClick={() =>
                  setConfirm({
                    action: 'delete',
                    ids: selectedIds,
                    title: t('deleteBulkTitle'),
                    message: t('deleteBulkMessage', { count: selectedIds.length }),
                  })
                }
              >
                {t('bulkDelete')}
              </button>
            )}
            <button className="nh-btn" type="button" onClick={() => setSelected(new Set())}>
              {tc('clearFilters')}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <Skeleton lines={6} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Table label={t('title')}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label={t('selected', { count: selectedIds.length })}
                    checked={items.length > 0 && items.every((item) => selected.has(item.id))}
                    onChange={toggleAll}
                  />
                </th>
                <th>{t('colTitle')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colCategory')}</th>
                <th>{t('colCuration')}</th>
                <th>{t('colUpdated')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} data-row={item.id} data-status={item.status}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      aria-label={item.title}
                    />
                  </td>
                  <td>
                    <Link href={`/articles/${item.id}`}>{item.title}</Link>
                    <div className="nh-muted">{item.slug}</div>
                    {item.scheduledAt && (
                      <div className="nh-muted" title={toUtcLabel(item.scheduledAt)}>
                        <span aria-hidden="true">⏱</span>{' '}
                        <span className="nh-sr-only">{ts('badge')}</span> {toLocalLabel(item.scheduledAt)}
                      </div>
                    )}
                  </td>
                  <td>{item.status}</td>
                  <td>{item.categorySlug}</td>
                  <td>
                    {item.isFeatured ? (
                      <>
                        <span aria-hidden="true">★</span>
                        <span className="nh-sr-only">{t('fieldFeatured')}</span>{' '}
                      </>
                    ) : (
                      ''
                    )}
                    {item.isBreaking ? (
                      <>
                        <span aria-hidden="true">●</span>
                        <span className="nh-sr-only">{t('fieldBreaking')}</span>
                      </>
                    ) : (
                      ''
                    )}
                  </td>
                  <td className="nh-muted">{item.updatedAt ?? ''}</td>
                  <td>
                    <div className="nh-row">
                      <Link className="nh-btn" href={`/articles/${item.id}`}>
                        {t('actionEdit')}
                      </Link>
                      {(isReviewer ? actionsFor(item.status).filter((a) => a !== 'delete') : actionsFor(item.status)).map((action) =>
                        action === 'delete' || action === 'archive' || action === 'reject' ? (
                          <button
                            key={action}
                            className={action === 'delete' ? 'nh-btn danger' : 'nh-btn'}
                            type="button"
                            onClick={() =>
                              setConfirm({
                                action,
                                ids: [item.id],
                                title:
                                  action === 'delete'
                                    ? t('deleteTitle')
                                    : action === 'reject'
                                      ? t('rejectTitle')
                                      : t('archiveTitle'),
                                message:
                                  action === 'delete'
                                    ? t('deleteMessage', { title: item.title })
                                    : action === 'reject'
                                      ? t('rejectMessage', { title: item.title })
                                      : t('archiveMessage', { title: item.title }),
                              })
                            }
                          >
                            {action === 'delete'
                              ? t('actionDelete')
                              : action === 'reject'
                                ? t('actionReject')
                                : t('actionArchive')}
                          </button>
                        ) : (
                          <button key={action} className="nh-btn" type="button" onClick={() => void runSingle(action, item)}>
                            {action === 'publish'
                              ? t('actionPublish')
                              : action === 'unpublish'
                                ? t('actionUnpublish')
                                : t('actionRestore')}
                          </button>
                        ),
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Paginator page={page} totalPages={totalPages} total={total} limit={limit} onPage={(next) => { setPage(next); syncUrl({ page: next }); }} />
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.action === 'delete' ? t('actionDelete') : t('confirm')}
          onConfirm={() => {
            const { action, ids } = confirm;
            setConfirm(null);
            if (ids.length === 1 && (action === 'delete' || action === 'archive' || action === 'reject')) {
              const item = items.find((row) => row.id === ids[0]);
              if (item) {
                void runSingle(action, item);
                return;
              }
            }
            void runBulk(action, ids);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}

export default function ArticlesPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <ArticlesBody />
      </Suspense>
    </RequireAuth>
  );
}
