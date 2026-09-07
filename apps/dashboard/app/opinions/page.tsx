'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface ListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
}

interface Option {
  id: string;
  label: string;
}

interface TranslationForm {
  slug: string;
  title: string;
  summary: string;
  content: string;
}

const EMPTY_TR: TranslationForm = { slug: '', title: '', summary: '', content: '' };

function splitParas(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default function OpinionsPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [authors, setAuthors] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [authorId, setAuthorId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [es, setEs] = useState<TranslationForm>({ ...EMPTY_TR });
  const [en, setEn] = useState<TranslationForm>({ ...EMPTY_TR });

  const statusQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`;

  async function load() {
    const res = await apiFetch(`/editorial/opinions?locale=es&limit=100${statusQuery}`);
    if (res.status === 401) {
      setError('Sesión requerida. Accede primero.');
      setItems([]);
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data: ListItem[] };
    setItems(json.data);
    const auths = await apiFetch('/authors');
    if (auths.ok) {
      const list = (await auths.json()) as Array<{
        id: string;
        slug: string;
        translations: Array<{ locale: string; name: string }>;
      }>;
      setAuthors(
        list.map((a) => ({
          id: a.id,
          label: `${a.translations.find((t) => t.locale === 'es')?.name ?? a.slug} (${a.slug})`,
        })),
      );
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/editorial/opinions?locale=es&limit=100${statusQuery}`);
        if (cancelled) return;
        if (res.status === 401) {
          setError('Sesión requerida. Accede primero.');
          setItems([]);
        } else if (!res.ok) {
          setError(`HTTP ${res.status}`);
        } else {
          const json = (await res.json()) as { data: ListItem[] };
          setItems(json.data);
        }
        const auths = await apiFetch('/authors');
        if (!cancelled && auths.ok) {
          const list = (await auths.json()) as Array<{
            id: string;
            slug: string;
            translations: Array<{ locale: string; name: string }>;
          }>;
          setAuthors(
            list.map((a) => ({
              id: a.id,
              label: `${a.translations.find((t) => t.locale === 'es')?.name ?? a.slug} (${a.slug})`,
            })),
          );
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error de red.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, statusQuery]);

  function buildTranslations() {
    const translations = [
      {
        locale: 'es',
        slug: es.slug.trim(),
        title: es.title.trim(),
        summary: es.summary.trim(),
        content: splitParas(es.content),
      },
    ];
    if (en.slug.trim() && en.title.trim()) {
      translations.push({
        locale: 'en',
        slug: en.slug.trim(),
        title: en.title.trim(),
        summary: en.summary.trim() || es.summary.trim(),
        content: splitParas(en.content).length > 0 ? splitParas(en.content) : splitParas(es.content),
      });
    }
    return translations;
  }

  function resetForm() {
    setEditing(null);
    setAuthorId('');
    setEs({ ...EMPTY_TR });
    setEn({ ...EMPTY_TR });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!authorId) {
      setError('Selecciona un autor.');
      return;
    }
    const res = await apiFetch('/opinions', {
      method: 'POST',
      body: JSON.stringify({ authorId, translations: buildTranslations() }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    resetForm();
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function startEdit(id: string) {
    setError(null);
    const res = await apiFetch(`/editorial/opinions/${id}`);
    if (!res.ok) {
      setError(`HTTP ${res.status}`);
      return;
    }
    const row = (await res.json()) as {
      authorId: string;
      translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
    };
    const esT = row.translations.find((t) => t.locale === 'es');
    const enT = row.translations.find((t) => t.locale === 'en');
    setEditing(id);
    setAuthorId(row.authorId);
    setEs({
      slug: esT?.slug ?? '',
      title: esT?.title ?? '',
      summary: esT?.summary ?? '',
      content: (esT?.content ?? []).join('\n\n'),
    });
    setEn({
      slug: enT?.slug ?? '',
      title: enT?.title ?? '',
      summary: enT?.summary ?? '',
      content: (enT?.content ?? []).join('\n\n'),
    });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    const res = await apiFetch(`/opinions/${editing}`, {
      method: 'PATCH',
      body: JSON.stringify({ authorId, translations: buildTranslations() }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    resetForm();
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function remove(row: ListItem) {
    if (!window.confirm(`Eliminar el borrador «${row.title}»?`)) return;
    setError(null);
    const res = await apiFetch(`/opinions/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(`HTTP ${res.status}`);
      return;
    }
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function runAction(row: ListItem, action: 'publish' | 'unpublish' | 'archive' | 'restore') {
    const labels: Record<string, string> = {
      publish: 'publicar',
      unpublish: 'despublicar',
      archive: 'archivar',
      restore: 'restaurar',
    };
    if (!window.confirm(`${labels[action][0].toUpperCase()}${labels[action].slice(1)} «${row.title}»?`)) return;
    setError(null);
    const res = await apiFetch(`/opinions/${row.id}/${action}`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'invalid_transition' ? 'Transición no permitida desde su estado.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    setLoading(true);
    await load();
    setLoading(false);
  }

  function actionsFor(status: string): Array<'publish' | 'unpublish' | 'archive' | 'restore'> {
    if (status === 'published') return ['unpublish', 'archive'];
    if (status === 'archived') return ['restore'];
    return ['publish', 'archive'];
  }

  return (
    <main>
      <h1>Opiniones</h1>
      <p className="nh-muted">F3 crea siempre en borrador; la publicación es F4.</p>
      {error && (
        <div className="nh-error">
          {error} <Link href="/login">Acceder</Link>
        </div>
      )}
      <section className="nh-card">
        <h2>{editing ? 'Editar opinión' : 'Nueva opinión'}</h2>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="nh-field">
            <label htmlFor="author">Autor (requerido)</label>
            <select id="author" value={authorId} onChange={(e) => setAuthorId(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <h3>Español (requerido)</h3>
          <div className="nh-field">
            <label htmlFor="esSlug">Slug</label>
            <input id="esSlug" value={es.slug} onChange={(e) => setEs({ ...es, slug: e.target.value })} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esTitle">Título</label>
            <input id="esTitle" value={es.title} onChange={(e) => setEs({ ...es, title: e.target.value })} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esSummary">Resumen</label>
            <textarea id="esSummary" value={es.summary} onChange={(e) => setEs({ ...es, summary: e.target.value })} rows={2} required />
          </div>
          <div className="nh-field">
            <label htmlFor="esContent">Contenido (párrafos separados por línea en blanco)</label>
            <textarea id="esContent" value={es.content} onChange={(e) => setEs({ ...es, content: e.target.value })} rows={6} required />
          </div>
          <h3>English (opcional)</h3>
          <div className="nh-field">
            <label htmlFor="enSlug">Slug</label>
            <input id="enSlug" value={en.slug} onChange={(e) => setEn({ ...en, slug: e.target.value })} />
          </div>
          <div className="nh-field">
            <label htmlFor="enTitle">Título</label>
            <input id="enTitle" value={en.title} onChange={(e) => setEn({ ...en, title: e.target.value })} />
          </div>
          <div className="nh-field">
            <label htmlFor="enSummary">Resumen</label>
            <textarea id="enSummary" value={en.summary} onChange={(e) => setEn({ ...en, summary: e.target.value })} rows={2} />
          </div>
          <div className="nh-field">
            <label htmlFor="enContent">Contenido</label>
            <textarea id="enContent" value={en.content} onChange={(e) => setEn({ ...en, content: e.target.value })} rows={6} />
          </div>
          <div className="nh-row">
            <button className="nh-btn primary" type="submit">
              {editing ? 'Guardar' : 'Crear borrador'}
            </button>
            {editing && (
              <button className="nh-btn" type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="nh-card">
        <h2>Listado</h2>
        <div className="nh-field">
          <label htmlFor="statusFilter">Estado</label>
          <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="review">Revisión</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </div>
        {loading ? (
          <p className="nh-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="nh-muted">No hay opiniones.</p>
        ) : (
          <table className="nh-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.title}
                    <div className="nh-muted">{row.slug}</div>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <div className="nh-row">
                      {actionsFor(row.status).map((action) => (
                        <button key={action} className="nh-btn" type="button" onClick={() => void runAction(row, action)}>
                          {action === 'publish' ? 'Publicar' : action === 'unpublish' ? 'Despublicar' : action === 'archive' ? 'Archivar' : 'Restaurar'}
                        </button>
                      ))}
                      <button className="nh-btn" type="button" onClick={() => void startEdit(row.id)}>
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
