import { useTranslations, useLocale } from 'next-intl';
import type { NewsArticle, FullNewsArticle, OpinionArticle, ArticleContent } from '../../../data/newsModels';

type AnyArticle = NewsArticle | FullNewsArticle | OpinionArticle | ArticleContent;

/**
 * useArticleTranslator - Hook para gestionar la internacionalización de artículos.
 *
 * F10.0 decoupled: title/summary/alt/content come from the API already
 * resolved per locale (localeResolved/fallback flags); no data.articles.*
 * overlay is consulted. Category display labels come from the UI namespace
 * (news.category.labels), keyed by normalized slug. Dates are formatted
 * per locale (UI concern, kept).
 */
export const useArticleTranslator = () => {
  const t = useTranslations();
  const locale = useLocale();

  const categoryLabel = (category: string | undefined): string => {
    const key = category?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const path = `news.category.labels.${key}`;
    return key && t.has(path) ? t(path) : (category ?? '');
  };

  return <T extends AnyArticle>(article: T | undefined | null): T => {
    if (!article || !article.id) return article as T;

    const { title, summary, alt } = article;
    const category = categoryLabel(article.category);

    // Formateo de fecha según locale
    let dateText = article.date;
    if (article.datetime && locale) {
      try {
        const d = new Date(article.datetime);
        dateText = new Intl.DateTimeFormat(locale.startsWith('en') ? 'en-US' : 'es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(d);
      } catch {
        // Fallback
      }
    }

    // Creamos la base traducida
    const translatedBase = {
      ...article,
      title,
      summary,
      category,
      alt,
      date: dateText,
    };

    // Si el artículo tiene content (FullNewsArticle), el contenido ya viene
    // resuelto por locale desde la API.
    if ('content' in article && Array.isArray(article.content)) {
      const fullArticle = translatedBase as unknown as FullNewsArticle;

      // Traducimos el breadcrumb si existe
      if (fullArticle.breadcrumb) {
        fullArticle.breadcrumb = {
          ...fullArticle.breadcrumb,
          current: title
        };
      }

      // Labels de categoría para related news (valores API + mapa UI)
      if (Array.isArray(fullArticle.relatedNews)) {
        fullArticle.relatedNews = fullArticle.relatedNews.map(rel => {
          return {
            ...rel,
            category: categoryLabel(rel.category)
          };
        });
      }

      return fullArticle as unknown as T;
    }

    return (translatedBase as unknown) as T;
  };
};
