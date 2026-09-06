'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
}

const EMPTY = { sort: '0', esSlug: '', esLabel: '', esDesc: '', enSlug: '', enLabel: '' };

export default function CategoriesPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/categories?locale=es&limit=100');
      if (res.status === 401) {
        setError('Sesión requerida. Accede primero.');
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: CategoryRow[] };
      setItems(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/categories?locale=es&limit=100')
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setError('Sesión requerida. Accede primero.');
          setItems([]);
        } else if (!res.ok) {
          setError(`HTTP ${res.status}`);
        } else {
          const json = (await res.json()) as { data: CategoryRow[] };
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

  function payload() {
    const translations: Array<{ locale: string; slug: string; label: string; description?: string | null }> = [
      { locale: 'es', slug: form.esSlug.trim(), label: form.esLabel.trim(), description: form.esDesc.trim() || null },
    ];
    if (form.enSlug.trim() && form.enLabel.trim()) {
      translations.push({ locale: 'en', slug: form.enSlug.trim(), label: form.enLabel.trim() });
    }
    return { sort: Number(form.sort) || 0, translations };
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await apiFetch('/categories?locale=es', {
      method: 'POST',
      body: JSON.stringify(payload()),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    setForm(EMPTY);
    await load();
  }

  function startEdit(row: CategoryRow) {
    setEditing(row.id);
    setForm({ ...EMPTY, sort: String(row.sort), esSlug: row.slug, esLabel: row.label, esDesc: row.description ?? '' });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    const res = await apiFetch(`/categories/${editing}?locale=es`, {
      method: 'PATCH',
      body: JSON.stringify(payload()),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    setEditing(null);
    setForm(EMPTY);
    await load();
  }

  async function remove(row: CategoryRow) {
    if (!window.confirm(`Eliminar la categoría «${row.label}»?`)) return;
    setError(null);
    const res = await apiFetch(`/categories/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(
        res.status === 409
          ? 'No se puede eliminar: todavía tiene artículos.'
          : (body?.detail ?? `HTTP ${res.status}`),
      );
      return;
    }
    await load();
  }

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <main>
      <h1>Categorías</h1>
      {error && (
        <div className="nh-error">
          {error} <Link href="/login">Acceder</Link>
        </div>
      )}
      <section className="nh-card">
        <h2>{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="nh-field">
            <label htmlFor="sort">Orden</label>
            <input id="sort" value={form.sort} onChange={set('sort')} inputMode="numeric" />
          </div>
          <div className="nh-field">
            <label htmlFor="esSlug">Slug (es)</label>
            <input id="esSlug" value={form.esSlug} onChange={set('esSlug')} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esLabel">Nombre (es)</label>
            <input id="esLabel" value={form.esLabel} onChange={set('esLabel')} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esDesc">Descripción (es)</label>
            <textarea id="esDesc" value={form.esDesc} onChange={set('esDesc')} rows={2} />
          </div>
          <div className="nh-field">
            <label htmlFor="enSlug">Slug (en, opcional)</label>
            <input id="enSlug" value={form.enSlug} onChange={set('enSlug')} />
          </div>
          <div className="nh-field">
            <label htmlFor="enLabel">Nombre (en, opcional)</label>
            <input id="enLabel" value={form.enLabel} onChange={set('enLabel')} />
          </div>
          <div className="nh-row">
            <button className="nh-btn primary" type="submit">
              {editing ? 'Guardar' : 'Crear'}
            </button>
            {editing && (
              <button
                className="nh-btn"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="nh-card">
        <h2>Listado</h2>
        {loading ? (
          <p className="nh-muted">Cargando…</p>
        ) : (
          <table className="nh-table">
            <thead>
              <tr>
                <th>Etiqueta</th>
                <th>Slug</th>
                <th>Orden</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>
                    <span className="nh-muted">{row.slug}</span>
                  </td>
                  <td>{row.sort}</td>
                  <td>
                    <div className="nh-row">
                      <button className="nh-btn" type="button" onClick={() => startEdit(row)}>
                        Editar
                      </button>
                      <button className="nh-btn danger" type="button" onClick={() => void remove(row)}>
                        Eliminar
                      </button>
                    </div>
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
