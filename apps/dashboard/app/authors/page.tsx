'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface AuthorRow {
  id: string;
  slug: string;
  translations: Array<{ locale: string; name: string; bio: string | null }>;
}

const EMPTY = { slug: '', esName: '', esBio: '', enName: '', enBio: '' };

function nameOf(row: AuthorRow): string {
  return row.translations.find((t) => t.locale === 'es')?.name ?? row.slug;
}

export default function AuthorsPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/authors');
      if (res.status === 401) {
        setError('Sesión requerida. Accede primero.');
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems(((await res.json()) as AuthorRow[]).slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/authors')
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setError('Sesión requerida. Accede primero.');
          setItems([]);
        } else if (!res.ok) {
          setError(`HTTP ${res.status}`);
        } else {
          const rows = (await res.json()) as AuthorRow[];
          setItems(rows.slice().sort((a, b) => nameOf(a).localeCompare(nameOf(b))));
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
    const translations = [
      { locale: 'es', name: form.esName.trim(), bio: form.esBio.trim() || null },
    ];
    if (form.enName.trim()) {
      translations.push({ locale: 'en', name: form.enName.trim(), bio: form.enBio.trim() || null });
    }
    return { slug: form.slug.trim(), translations };
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await apiFetch('/authors', { method: 'POST', body: JSON.stringify(payload()) });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    setForm(EMPTY);
    await load();
  }

  function startEdit(row: AuthorRow) {
    const es = row.translations.find((t) => t.locale === 'es');
    const en = row.translations.find((t) => t.locale === 'en');
    setEditing(row.id);
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
    if (!editing) return;
    setError(null);
    const res = await apiFetch(`/authors/${editing}`, {
      method: 'PATCH',
      body: JSON.stringify(payload()),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    setEditing(null);
    setForm(EMPTY);
    await load();
  }

  async function remove(row: AuthorRow) {
    if (!window.confirm(`Eliminar el autor «${nameOf(row)}»?`)) return;
    setError(null);
    const res = await apiFetch(`/authors/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      setError(
        res.status === 409
          ? 'No se puede eliminar: todavía tiene opiniones.'
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
      <h1>Autores</h1>
      <p className="nh-muted">Listado editorial (requiere sesión; sin superficie pública en v1).</p>
      {error && (
        <div className="nh-error">
          {error} <Link href="/login">Acceder</Link>
        </div>
      )}
      <section className="nh-card">
        <h2>{editing ? 'Editar autor' : 'Nuevo autor'}</h2>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="nh-field">
            <label htmlFor="slug">Slug</label>
            <input id="slug" value={form.slug} onChange={set('slug')} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esName">Nombre (es)</label>
            <input id="esName" value={form.esName} onChange={set('esName')} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esBio">Bio (es)</label>
            <textarea id="esBio" value={form.esBio} onChange={set('esBio')} rows={2} />
          </div>
          <div className="nh-field">
            <label htmlFor="enName">Nombre (en, opcional)</label>
            <input id="enName" value={form.enName} onChange={set('enName')} />
          </div>
          <div className="nh-field">
            <label htmlFor="enBio">Bio (en, opcional)</label>
            <textarea id="enBio" value={form.enBio} onChange={set('enBio')} rows={2} />
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
        ) : items.length === 0 ? (
          <p className="nh-muted">No hay autores todavía.</p>
        ) : (
          <table className="nh-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{nameOf(row)}</td>
                  <td>
                    <span className="nh-muted">{row.slug}</span>
                  </td>
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
