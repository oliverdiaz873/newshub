'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface MediaRow {
  id: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export default function MediaPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/media?limit=100');
      if (res.status === 401) {
        setError('Sesión requerida. Accede primero.');
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: MediaRow[] };
      setItems(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/media?limit=100')
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setError('Sesión requerida. Accede primero.');
          setItems([]);
        } else if (!res.ok) {
          setError(`HTTP ${res.status}`);
        } else {
          const json = (await res.json()) as { data: MediaRow[] };
          setItems(json.data);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error de red.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Selecciona un archivo (JPEG, PNG, WebP o AVIF, máx. 5 MB).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch('/media', { method: 'POST', body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
        setError(
          body?.code === 'file_too_large'
            ? 'El archivo supera los 5 MB.'
            : (body?.detail ?? `HTTP ${res.status}`),
        );
        return;
      }
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: MediaRow) {
    if (!window.confirm('Eliminar esta imagen?')) return;
    setError(null);
    const res = await apiFetch(`/media/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(
        body?.code === 'media_in_use'
          ? 'No se puede eliminar: está asignada como portada.'
          : (body?.detail ?? `HTTP ${res.status}`),
      );
      return;
    }
    await load();
  }

  return (
    <main>
      <h1>Media</h1>
      <p className="nh-muted">JPEG, PNG, WebP o AVIF · máx. 5 MB. Las portadas en uso no se pueden eliminar.</p>
      {error && (
        <div className="nh-error">
          {error} <Link href="/login">Acceder</Link>
        </div>
      )}
      <section className="nh-card">
        <h2>Subir imagen</h2>
        <form onSubmit={upload}>
          <div className="nh-field">
            <label htmlFor="file">Archivo</label>
            <input
              id="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                if (preview) URL.revokeObjectURL(preview);
                setFile(next);
                setPreview(next ? URL.createObjectURL(next) : null);
              }}
            />
          </div>
          {preview && (
            <div className="nh-field">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa" style={{ maxWidth: 320, borderRadius: 8 }} />
            </div>
          )}
          <button className="nh-btn primary" type="submit" disabled={busy || !file}>
            {busy ? 'Subiendo…' : 'Subir'}
          </button>
        </form>
      </section>
      <section className="nh-card">
        <h2>Listado</h2>
        {loading ? (
          <p className="nh-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="nh-muted">No hay imágenes.</p>
        ) : (
          <table className="nh-table">
            <thead>
              <tr>
                <th>Vista</th>
                <th>Formato</th>
                <th>Dimensiones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.url} alt="" style={{ maxWidth: 120, borderRadius: 6 }} />
                  </td>
                  <td>
                    <span className="nh-muted">{row.mime}</span>
                  </td>
                  <td>{row.width && row.height ? `${row.width}×${row.height}` : '—'}</td>
                  <td>
                    <button className="nh-btn danger" type="button" onClick={() => void remove(row)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
