import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createTranslator } from 'next-intl';
import { newsArticles, opinionArticles } from '../../../data';
import { hasSearchQuery, matchesSearchQuery } from '../../../shared/utils/searchUtils';

/**
 * Hook para gestionar la lógica de búsqueda global de noticias y opiniones.
 * 
 * Filtra los datos centralizados basándose en el parámetro 'q' de la URL.
 * Búsqueda bilingüe: siempre busca en AMBOS idiomas (ES + EN),
 * independientemente del idioma activo, para una experiencia profesional.
 * 
 * El diccionario EN se carga dinámicamente solo cuando hay una query activa
 * para evitar incluir ~91KB en el bundle inicial del cliente.
 */
export const useSearch = (overrideQuery?: string) => {
  const searchParams = useSearchParams();
  const query = overrideQuery !== undefined ? overrideQuery : (searchParams.get('q') || '');
  const [enTranslator, setEnTranslator] = useState<((key: string) => string) | null>(null);

  useEffect(() => {
    if (hasSearchQuery(query)) {
      let cancelled = false;
      import('../../../../messages/en.json').then((mod) => {
        if (cancelled) return;
        setEnTranslator(() => createTranslator({ locale: 'en', messages: mod.default }) as (key: string) => string);
      });
      return () => { cancelled = true; };
    } else {
      setEnTranslator(null);
    }
  }, [query]);

  const results = useMemo(() => {
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

  return {
    query,
    results,
    count: results.length,
    isEmpty: results.length === 0 && query.length > 0,
    hasQuery: query.length > 0
  };
};
