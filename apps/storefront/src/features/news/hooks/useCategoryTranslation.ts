import { useTranslations } from 'next-intl';
import type { CategoryPageContent } from '../../../data/newsModels';
import { useArticleTranslator } from './useArticleTranslation';

/**
 * useCategoryTranslation - Hook para gestionar la internacionalización de datos de categoría.
 */
export const useCategoryTranslation = (content?: CategoryPageContent): CategoryPageContent | undefined => {
  const t = useTranslations();
  const translateArticle = useArticleTranslator();
  
  if (!content || !content.slug) return content;

  const basePath = `data.categories.${content.slug}`;
  
  const getVal = (key: string, defaultValue: string) => {
    return t.has(key) ? t(key) : defaultValue;
  };

  // Traducimos los campos base de la categoría
  const translatedContent: CategoryPageContent = {
    ...content,
    label: getVal(`${basePath}.label`, content.label),
    description: getVal(`${basePath}.description`, content.description),
    latestTitle: getVal(`${basePath}.latestTitle`, content.latestTitle),
    sidebarTitle: getVal(`${basePath}.sidebarTitle`, content.sidebarTitle),
    featuredSection: {
      ...content.featuredSection,
      title: getVal(`${basePath}.featuredSectionTitle`, content.featuredSection.title),
      // Traducimos los artículos destacados
      primary: translateArticle(content.featuredSection.primary),
      secondary: [
        translateArticle(content.featuredSection.secondary[0]),
        translateArticle(content.featuredSection.secondary[1]),
        translateArticle(content.featuredSection.secondary[2]),
      ],
      grid: content.featuredSection.grid.map(translateArticle),
    },
    // Traducimos las listas de noticias
    latestNews: content.latestNews.map(translateArticle),
    sidebarNews: content.sidebarNews.map(translateArticle),
    opinionArticles: content.opinionArticles.map(translateArticle),
  };

  return translatedContent;
};
