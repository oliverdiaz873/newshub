'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toasts';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RequireAuth } from '@/components/RequireAuth';
import { ConfirmDialog } from '@/components/Modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/States';
import { Paginator } from '@/components/Table';
import { LoadingFallback } from '@/components/LoadingFallback';
import { MediaThumb, mediaLabel, type MediaOption } from '@/components/MediaCard';

interface MediaRow extends MediaOption {
  createdAt: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PAGE_SIZE_KEY = 'newshub-pagesize-media';
const PAGE_SIZES = [10, 20, 50];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(input);
      return ok;
    } catch {
      return false;
    }
  }
}

function MediaBody() {
  const t = useTranslations('media');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiFetch } = useAuth();
  const { notify } = useToast();

  const [items, setItems] = useState<MediaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<MediaRow | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const paramsKey = useMemo(
    () => JSON.stringify({ query, page, limit, reloadToken }),
    [query, page, limit, reloadToken],
  );

  const syncUrl = useCallback(
    (patch: Partial<{ q: string; page: number; limit: number }>) => {
      const params = new URLSearchParams();
      const next = { q: patch.q ?? query, page: patch.page ?? page, limit: patch.limit ?? limit };
      if (next.q) params.set('q', next.q);
      if (next.page !== 1) params.set('page', String(next.page));
      if (next.limit !== 20) params.set('limit', String(next.limit));
      const qs = params.toString();
      router.replace(qs ? `/media?${qs}` : '/media', { scroll: false });
    },
    [query, page, limit, router],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = JSON.parse(paramsKey) as { page: number; limit: number };
      setLoading(true);
      setError(null);
      try {
        // Server pagination only: the API has no media search, so `q`
        // stays a local filter applied below (see searchHint).
        const res = await apiFetch(`/media?page=${state.page}&limit=${state.limit}`);
        if (cancelled) return;
        if (res.status === 401) {
          setError(tc('sessionRequired'));
          setItems([]);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { data: MediaRow[]; meta: { total: number; totalPages: number } };
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

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const filtered = query.trim()
    ? items.filter((row) => `${row.mime} ${row.id}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items;
  // The `q` filter is page-local (no server search): while filtering, the
  // pager reflects the visible subset instead of the server totals.
  const filtering = query.trim().length > 0;
  const viewTotal = filtering ? filtered.length : total;
  const viewPages = filtering ? 1 : totalPages;

  function pick(next: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError(t('selectFile'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      notify(t('tooLarge'), 'err');
      return;
    }
    if (!ACCEPT.split(',').includes(file.type)) {
      notify(t('badFormat'), 'err');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch('/media', { method: 'POST', body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
        notify(body?.message ?? `HTTP ${res.status}`, 'err');
        return;
      }
      pick(null);
      if (fileRef.current) fileRef.current.value = '';
      notify(t('uploaded'), 'ok');
      setReloadToken((token) => token + 1);
    } catch {
      notify(t('badFormat'), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: MediaRow) {
    const res = await apiFetch(`/media/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      notify(body?.code === 'media_in_use' ? t('inUse') : `HTTP ${res.status}`, 'err');
      return;
    }
    notify(t('deleted'), 'ok');
    setReloadToken((token) => token + 1);
  }

  async function copyUrl(row: MediaRow) {
    const ok = await copyText(row.url);
    notify(ok ? t('copied') : t('copyFailed'), ok ? 'ok' : 'err');
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>
      <p className="nh-muted">{t('subtitle')}</p>
      {error && <ErrorState message={error} onRetry={() => setReloadToken((token) => token + 1)} />}

      <section className="nh-card" aria-label={t('uploadTitle')}>
        <h2>{t('uploadTitle')}</h2>
        <form onSubmit={(event) => void upload(event)}>
          <div className="nh-field">
            <label htmlFor="media-file">{t('file')}</label>
            <input
              ref={fileRef}
              id="media-file"
              type="file"
              accept={ACCEPT}
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
            />
          </div>
          {preview && (
            <div className="nh-field">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt={t('preview')} style={{ maxWidth: 320, borderRadius: 8 }} />
            </div>
          )}
          <button className="nh-btn primary" type="submit" disabled={busy || !file}>
            {busy ? t('uploading') : t('upload')}
          </button>
        </form>
      </section>

      <section className="nh-card" aria-label={t('title')}>
        <div className="nh-field">
          <label htmlFor="media-q">{t('searchLabel')}</label>
          <input
            id="media-q"
            type="search"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              syncUrl({ q: event.target.value, page: 1 });
            }}
          />
          <span className="nh-muted">{t('searchHint')}</span>
        </div>
        <div className="nh-row">
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

        {loading ? (
          <Skeleton lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <div className="nh-media-grid nh-media-manager">
              {filtered.map((row) => (
                <article key={row.id} className="nh-media-card" aria-label={mediaLabel(row)}>
                  <MediaThumb item={row} width={240} height={150} />
                  <div className="nh-media-meta">
                    <span className="nh-muted">{row.mime}</span>
                    <span className="nh-muted">
                      {row.width && row.height ? `${row.width}×${row.height}` : '—'}
                    </span>
                    <span className="nh-muted">{new Date(row.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="nh-row">
                    <button className="nh-btn" type="button" onClick={() => void copyUrl(row)}>
                      {t('copy')}
                    </button>
                    <button className="nh-btn danger" type="button" onClick={() => setConfirm(row)}>
                      {t('delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <Paginator
              page={filtering ? 1 : page}
              totalPages={viewPages}
              total={viewTotal}
              limit={limit}
              onPage={(next) => {
                if (filtering) return;
                setPage(next);
                syncUrl({ page: next });
              }}
            />
            {filtering && <p className="nh-muted">{t('filteredCount', { count: filtered.length })}</p>}
          </>
        )}
      </section>

      {confirm && (
        <ConfirmDialog
          title={t('deleteTitle')}
          message={t('deleteMessage')}
          confirmLabel={t('delete')}
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

export default function MediaPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <MediaBody />
      </Suspense>
    </RequireAuth>
  );
}
