import { useTranslations, useLocale } from 'next-intl';
import type { NewsArticle, FullNewsArticle, OpinionArticle, ArticleContent } from '../../../data/newsModels';

type AnyArticle = NewsArticle | FullNewsArticle | OpinionArticle | ArticleContent;

/**
 * useArticleTranslation - Hook para gestionar la internacionalización de artículos.
 *
 * Implementa el patrón "Overlay & Fallback" (inspirado en Hypermercado):
 * Busca la traducción del artículo en 'data.articles.{id}',
 * si no existe, usa las propiedades originales del objeto de datos en español.
 */
export const useArticleTranslator = () => {
  const t = useTranslations();
  const locale = useLocale();
  
  return <T extends AnyArticle>(article: T | undefined | null): T => {
    if (!article || !article.id) return article as T;

    const articleId = article.id;
    
    const getVal = (key: string, defaultValue: string) => {
      return t.has(key) ? t(key) : defaultValue;
    };

    // Obtenemos los campos traducidos con fallback al original
    const title = getVal(`data.articles.${articleId}.title`, article.title);
    const summary = getVal(`data.articles.${articleId}.summary`, article.summary);
    const alt = getVal(`data.articles.${articleId}.alt`, article.alt);
    
    // Para la categoría, primero intentamos buscarla en el mapeo de categorías
    // Si no, usamos el valor directo del artículo
    const categoryKey = article.category?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const category = getVal(`data.categories.${categoryKey}.label`, article.category);
    
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

    // Si el artículo tiene content (FullNewsArticle), lo traducimos también
    if ('content' in article && Array.isArray(article.content)) {
      const fullArticle = translatedBase as unknown as FullNewsArticle;
      
      // Intentamos obtener el contenido traducido (array)
      const contentKey = `data.articles.${articleId}.content`;
      if (t.has(contentKey)) {
        const translatedContent = t.raw(contentKey);
        if (Array.isArray(translatedContent)) {
          fullArticle.content = translatedContent.filter((item): item is string => typeof item === 'string');
        }
      }
      
      // Traducimos el breadcrumb si existe
      if (fullArticle.breadcrumb) {
        fullArticle.breadcrumb = {
          ...fullArticle.breadcrumb,
          current: title
        };
      }

      // TRADUCCIÓN RECURSIVA PARA RELATED NEWS
      // (Usamos la misma lógica para traducir los metadatos de los artículos relacionados)
      if (Array.isArray(fullArticle.relatedNews)) {
        fullArticle.relatedNews = fullArticle.relatedNews.map(rel => {
          const relId = rel.id;
          const relTitle = getVal(`data.articles.${relId}.title`, rel.title);
          const relSummary = getVal(`data.articles.${relId}.summary`, rel.summary);
          const relAlt = getVal(`data.articles.${relId}.alt`, rel.alt);
          const relCatKey = rel.category?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const relCat = getVal(`data.categories.${relCatKey}.label`, rel.category);
          
          return {
            ...rel,
            title: relTitle,
            summary: relSummary,
            alt: relAlt,
            category: relCat
          };
        });
      }
      
      return fullArticle as unknown as T;
    }

    return (translatedBase as unknown) as T;
  };
};
