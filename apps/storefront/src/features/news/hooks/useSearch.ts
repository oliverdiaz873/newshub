import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createTranslator, useLocale } from 'next-intl';
import { newsArticles, opinionArticles } from '../../../data';
import { hasSearchQuery, matchesSearchQuery } from '../../../shared/utils/searchUtils';
import { getApiBase, searchAll, type SearchResultItem } from '@/lib/api';

/**
 * Hook para gestionar la lógica de búsqueda global de noticias y opiniones.
 *
 * F3.1 search API-first: con NEXT_PUBLIC_API_URL configurado, los
 * resultados vienen de GET /articles?q= + GET /opinions?q= en paralelo
 * (merge por publishedAt DESC). La capa local estática permanece
 * únicamente como fallback de desarrollo (API no configurada).
 * Limitación MVP conocida: el matching API es ILIKE sensible a tildes
 * sobre title/summary; `economia` no encuentra `Economía`.
 */
export const useSearch = (overrideQuery?: string) => {
  const searchParams = useSearchParams();
  const query = overrideQuery !== undefined ? overrideQuery : (searchParams.get('q') || '');
  const locale = useLocale();
  const apiBase = getApiBase();
  const [enTranslator, setEnTranslator] = useState<((key: string) => string) | null>(null);
  // F3 review fix: API results/errors are keyed by the query that produced
  // them. While a new query is in flight (or after it changed), the render
  // must not show previous-query results nor rethrow a previous error:
  // the cleanup effect runs after render, so a bare `apiError` flag would
  // poison every subsequent render, including recovery searches.
  const [apiState, setApiState] = useState<{
    query: string;
    results: SearchResultItem[] | null;
    error: Error | null;
  }>({ query: '', results: null, error: null });

  useEffect(() => {
    if (apiBase) return;
    if (hasSearchQuery(query)) {
      let cancelled = false;
      import('../../../../messages/en.json').then((mod) => {
        if (cancelled) return;
        setEnTranslator(() => createTranslator({ locale: 'en', messages: mod.default }) as (key: string) => string);
      });
      return () => { cancelled = true; };
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional cache reset: frees the EN translator when the query is cleared; results are already [] via the useMemo guard below, so no cascading render affects output
      setEnTranslator(null);
    }
  }, [query, apiBase]);

  useEffect(() => {
    if (!apiBase || !hasSearchQuery(query)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional cache reset: clears API results/error when the query is cleared or API is unavailable; consumers already render []/fallback from null, so no cascading render affects output
      setApiState({ query, results: null, error: null });
      return;
    }
    let cancelled = false;
    searchAll(query, locale).then(
      (res) => {
        if (cancelled) return;
        if (res.outcome === 'ok' && res.data) setApiState({ query, results: res.data.results, error: null });
        else if (res.outcome === 'error') setApiState({ query, results: null, error: new Error(`Newshub API search failed for q=${query}`) });
        else setApiState({ query, results: null, error: null });
      },
      (err: unknown) => {
        if (!cancelled) setApiState({ query, results: null, error: err instanceof Error ? err : new Error('Newshub API search failed') });
      },
    );
    return () => { cancelled = true; };
  }, [query, locale, apiBase]);

  // Error de backend -> error.tsx (nunca datos locales en producción).
  // Solo cuando el error pertenece a la query actual: al cambiar de query,
  // el estado obsoleto se ignora para permitir recuperación y no mostrar
  // resultados ajenos mientras el nuevo fetch está en vuelo.
  const settled = apiState.query === query;

  const localResults = useMemo(() => {
    if (!hasSearchQuery(query) || !enTranslator) return [];

    const allContent = [
      ...newsArticles,
      ...opinionArticles
    ];

    const getEnVal = (key: string) => enTranslator(key) ?? '';

    return allContent.filter(article => {
      const matchesOriginal =
        matchesSearchQuery(article.title, query) ||
        matchesSearchQuery(article.category, query) ||
        matchesSearchQuery(article.summary, query);

      if (matchesOriginal) return true;

      const enTitle = getEnVal(`data.articles.${article.id}.title`);
      const enSummary = getEnVal(`data.articles.${article.id}.summary`);
      const categoryKey = article.category?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const enCategory = getEnVal(`data.categories.${categoryKey}.label`);

      return (
        (enTitle && matchesSearchQuery(enTitle, query)) ||
        (enCategory && matchesSearchQuery(enCategory, query)) ||
        (enSummary && matchesSearchQuery(enSummary, query))
      );
    });
  }, [query, enTranslator]);

  if (!settled) {
    return {
      query,
      results: [],
      count: 0,
      isEmpty: query.length > 0,
      hasQuery: query.length > 0,
    };
  }
  if (apiState.error) throw apiState.error;

  const results = apiBase ? (apiState.results ?? []) : localResults;

  return {
    query,
    results,
    count: results.length,
    isEmpty: results.length === 0 && query.length > 0,
    hasQuery: query.length > 0
  };
};
