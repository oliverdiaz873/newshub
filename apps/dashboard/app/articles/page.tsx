'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

interface ListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  categorySlug: string;
  isBreaking: boolean;
  isFeatured: boolean;
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

export default function ArticlesPage() {
  const { apiFetch } = useAuth();
  const [items, setItems] = useState<ListItem[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [authors, setAuthors] = useState<Option[]>([]);
  const [media, setMedia] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [coverId, setCoverId] = useState('');
  const [initialCover, setInitialCover] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [curationFilter, setCurationFilter] = useState('all');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [es, setEs] = useState<TranslationForm>({ ...EMPTY_TR });
  const [en, setEn] = useState<TranslationForm>({ ...EMPTY_TR });

  const statusQuery = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
  const curationQuery =
    curationFilter === 'breaking' ? '&breaking=true' : curationFilter === 'featured' ? '&featured=true' : '';
  const listQuery = `${statusQuery}${curationQuery}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [arts, cats, auths, meds] = await Promise.all([
        apiFetch(`/editorial/articles?locale=es&limit=100${listQuery}`),
        apiFetch('/editorial/categories?locale=es&limit=100'),
        apiFetch('/authors'),
        apiFetch('/media?limit=100'),
      ]);
      if (arts.status === 401 || cats.status === 401 || auths.status === 401 || meds.status === 401) {
        setError('Sesión requerida. Accede primero.');
        setItems([]);
        return;
      }
      if (!arts.ok || !cats.ok || !auths.ok || !meds.ok) throw new Error('Error cargando datos.');
      const articles = (await arts.json()) as { data: ListItem[] };
      setItems(articles.data);
      const catJson = (await cats.json()) as { data: Array<{ id: string; slug: string; label: string }> };
      setCategories(catJson.data.map((c) => ({ id: c.id, label: `${c.label} (${c.slug})` })));
      const authJson = (await auths.json()) as Array<{
        id: string;
        slug: string;
        translations: Array<{ locale: string; name: string }>;
      }>;
      setAuthors(
        authJson.map((a) => ({
          id: a.id,
          label: `${a.translations.find((t) => t.locale === 'es')?.name ?? a.slug} (${a.slug})`,
        })),
      );
      const medJson = (await meds.json()) as { data: Array<{ id: string; mime: string }> };
      setMedia(medJson.data.map((m) => ({ id: m.id, label: `${m.id.slice(0, 8)} (${m.mime})` })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, listQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch(`/editorial/articles?locale=es&limit=100${listQuery}`);
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
      const cats = await apiFetch('/editorial/categories?locale=es&limit=100');
      if (!cancelled && cats.ok) {
        const json = (await cats.json()) as { data: Array<{ id: string; slug: string; label: string }> };
        setCategories(json.data.map((c) => ({ id: c.id, label: `${c.label} (${c.slug})` })));
      }
      const auths = await apiFetch('/authors');
      if (!cancelled && auths.ok) {
        const json = (await auths.json()) as Array<{
          id: string;
          slug: string;
          translations: Array<{ locale: string; name: string }>;
        }>;
        setAuthors(
          json.map((a) => ({
            id: a.id,
            label: `${a.translations.find((t) => t.locale === 'es')?.name ?? a.slug} (${a.slug})`,
          })),
        );
      }
      const meds = await apiFetch('/media?limit=100');
      if (!cancelled && meds.ok) {
        const json = (await meds.json()) as { data: Array<{ id: string; mime: string }> };
        setMedia(json.data.map((m) => ({ id: m.id, label: `${m.id.slice(0, 8)} (${m.mime})` })));
      }
      if (!cancelled) setLoading(false);
    })().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Error de red.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, listQuery]);

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
    setCategoryId('');
    setAuthorId('');
    setCoverId('');
    setInitialCover(null);
    setIsBreaking(false);
    setIsFeatured(false);
    setEs({ ...EMPTY_TR });
    setEn({ ...EMPTY_TR });
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!categoryId) {
      setError('Selecciona una categoría.');
      return;
    }
    const res = await apiFetch('/articles', {
      method: 'POST',
      body: JSON.stringify({
        categoryId,
        authorId: authorId || undefined,
        coverMediaId: coverId || undefined,
        translations: buildTranslations(),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    resetForm();
    await load();
  }

  async function startEdit(id: string) {
    setError(null);
    const res = await apiFetch(`/editorial/articles/${id}`);
    if (!res.ok) {
      setError(`HTTP ${res.status}`);
      return;
    }
    const row = (await res.json()) as {
      categoryId: string;
      authorId: string | null;
      coverMediaId: string | null;
      isBreaking: boolean;
      isFeatured: boolean;
      translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
    };
    const esT = row.translations.find((t) => t.locale === 'es');
    const enT = row.translations.find((t) => t.locale === 'en');
    setEditing(id);
    setCategoryId(row.categoryId);
    setAuthorId(row.authorId ?? '');
    setCoverId(row.coverMediaId ?? '');
    setInitialCover(row.coverMediaId ?? null);
    setIsBreaking(row.isBreaking ?? false);
    setIsFeatured(row.isFeatured ?? false);
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
    const res = await apiFetch(`/articles/${editing}`, {
      method: 'PATCH',
      body: JSON.stringify({
        categoryId: categoryId || undefined,
        authorId: authorId === '' ? undefined : authorId || null,
        coverMediaId: coverId === initialCover ? undefined : coverId || null,
        isBreaking,
        isFeatured,
        translations: buildTranslations(),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'slug_taken' ? 'Ese slug ya existe para el idioma.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    resetForm();
    await load();
  }

  async function remove(row: ListItem) {
    if (!window.confirm(`Eliminar el borrador «${row.title}»?`)) return;
    setError(null);
    const res = await apiFetch(`/articles/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(`HTTP ${res.status}`);
      return;
    }
    await load();
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
    const res = await apiFetch(`/articles/${row.id}/${action}`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; detail?: string } | null;
      setError(body?.code === 'invalid_transition' ? 'Transición no permitida desde su estado.' : (body?.detail ?? `HTTP ${res.status}`));
      return;
    }
    await load();
  }

  function actionsFor(status: string): Array<'publish' | 'unpublish' | 'archive' | 'restore'> {
    if (status === 'published') return ['unpublish', 'archive'];
    if (status === 'archived') return ['restore'];
    return ['publish', 'archive'];
  }

  return (
    <main>
      <h1>Artículos</h1>
      <p className="nh-muted">F3 crea siempre en borrador; la publicación es F4.</p>
      {error && (
        <div className="nh-error">
          {error} <Link href="/login">Acceder</Link>
        </div>
      )}
      <section className="nh-card">
        <h2>{editing ? 'Editar artículo' : 'Nuevo artículo'}</h2>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="nh-field">
            <label htmlFor="category">Categoría</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="nh-field">
            <label htmlFor="author">Autor (opcional)</label>
            <select id="author" value={authorId} onChange={(e) => setAuthorId(e.target.value)}>
              <option value="">Sin autor</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="nh-field">
            <label htmlFor="cover">Portada (opcional, desde /media)</label>
            <select id="cover" value={coverId} onChange={(e) => setCoverId(e.target.value)}>
              <option value="">Sin portada</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="nh-field">
            <label>Curaduría Home (manual, sin expiración automática)</label>
            <label htmlFor="isFeatured">
              <input
                id="isFeatured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />{' '}
              Destacada (pool featured, orden publishedAt DESC: primary/secondary/grid)
            </label>
            <label htmlFor="isBreaking">
              <input
                id="isBreaking"
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
              />{' '}
              Breaking (ticker, visible mientras sea true)
            </label>
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
        <div className="nh-field">
          <label htmlFor="curationFilter">Curaduría</label>
          <select id="curationFilter" value={curationFilter} onChange={(e) => setCurationFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="featured">Destacadas</option>
            <option value="breaking">Breaking</option>
          </select>
        </div>
        {loading ? (
          <p className="nh-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="nh-muted">No hay artículos.</p>
        ) : (
          <table className="nh-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Curaduría</th>
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
                    {row.isFeatured ? 'Destacada' : ''}
                    {row.isFeatured && row.isBreaking ? ' · ' : ''}
                    {row.isBreaking ? 'Breaking' : row.isFeatured ? '' : '—'}
                  </td>
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
