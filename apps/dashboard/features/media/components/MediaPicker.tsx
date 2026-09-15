'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { EmptyState, ErrorState, Skeleton } from '@/shared/components/States';
import { MediaThumb, mediaLabel } from './MediaCard';
import type { MediaOption } from '../types';
import { listMediaOptions, uploadMedia } from '../services/mediaService';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * Shared cover picker (Articles now, Opinions in Increment 3).
 * Server is authoritative for MIME/size; preview uses the existing
 * absolute content URL from the API view (never a local blob copy,
 * except the transient pre-upload preview).
 */
export function MediaPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const t = useTranslations('mediaPicker');
  const { apiFetch } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<MediaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = value ? (items.find((item) => item.id === value) ?? null) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMediaOptions(apiFetch);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: MediaOption[] };
      setItems(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    // Initial option load (single fetch by design).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const filtered = query.trim()
    ? items.filter((item) => `${item.id} ${item.mime}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  async function upload(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      notify(t('tooLarge'), 'err');
      return;
    }
    if (!ACCEPT.split(',').includes(file.type)) {
      notify(t('badFormat'), 'err');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await uploadMedia(apiFetch, form);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
        notify(body?.message ?? `HTTP ${res.status}`, 'err');
        return;
      }
      const created = (await res.json()) as MediaOption;
      setItems((current) => [created, ...current]);
      onChange(created.id);
      notify(t('uploaded'), 'ok');
    } catch {
      notify(t('badFormat'), 'err');
    } finally {
      setUploading(false);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  }

  return (
    <div className="nh-media-picker">
      {selected ? (
        <div className="nh-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.url} alt="" width={96} height={64} style={{ objectFit: 'cover', borderRadius: 6 }} />
          <span className="nh-muted">
            {selected.mime}
            {selected.width && selected.height ? ` · ${selected.width}×${selected.height}` : ''}
          </span>
          <button className="nh-btn" type="button" onClick={() => fileRef.current?.click()}>
            {t('change')}
          </button>
          <button className="nh-btn" type="button" onClick={() => onChange(null)}>
            {t('remove')}
          </button>
        </div>
      ) : (
        <div className="nh-row">
          {preview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="" width={96} height={64} style={{ objectFit: 'cover', borderRadius: 6 }} />
          )}
          <button className="nh-btn" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? t('uploading') : t('upload')}
          </button>
          <span className="nh-muted">{t('noCover')}</span>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        hidden
        aria-label={t('upload')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      <div className="nh-field" style={{ marginTop: 8 }}>
        <label htmlFor="media-picker-q">{t('searchLabel')}</label>
        <input
          id="media-picker-q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {loading ? (
        <Skeleton lines={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : filtered.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="nh-media-grid" role="group" aria-label={t('title')}>
          {filtered.slice(0, 24).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === value}
              className={item.id === value ? 'nh-media-cell selected' : 'nh-media-cell'}
              onClick={() => onChange(item.id === value ? null : item.id)}
              title={mediaLabel(item)}
            >
              <MediaThumb item={item} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
