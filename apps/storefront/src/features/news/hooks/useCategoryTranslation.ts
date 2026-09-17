import { useTranslations } from 'next-intl';
import type { CategoryPageContent } from '../../../data/newsModels';
import { useArticleTranslator } from './useArticleTranslation';

/**
 * useCategoryTranslation - Hook para gestionar la internacionalización de datos de categoría.
 *
 * F10.0 decoupled: labels/descriptions come from the API (CategoryTranslation);
 * presentation strings come from UI namespaces (home.*, metadata.category.*).
 * No data.categories.* overlay is consulted.
 */
export const useCategoryTranslation = (content?: CategoryPageContent): CategoryPageContent | undefined => {
  const tHome = useTranslations('home');
  const tMeta = useTranslations('metadata.category');
  const translateArticle = useArticleTranslator();

  if (!content || !content.slug) return content;

  // Traducimos los campos base de la categoría
  const translatedContent: CategoryPageContent = {
    ...content,
    label: content.label,
    description: content.description || tMeta('description', { label: content.label }),
    latestTitle: tHome('moreInCategory', { label: content.label }),
    sidebarTitle: tHome('opinion'),
    featuredSection: {
      ...content.featuredSection,
      title: content.featuredSection.title,
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
