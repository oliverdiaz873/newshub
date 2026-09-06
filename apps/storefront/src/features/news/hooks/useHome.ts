import {
  featuredPrimary,
  featuredSecondary,
  featuredGrid,
  latestNews,
  opinionArticles,
  type FeaturedSectionContent,
  type NewsArticle
} from '../../../data';
import { useTranslations } from 'next-intl';



/**
 * Hook personalizado para gestionar los contenidos de la Portada (Home).
 * 
 * Centraliza el acceso a las noticias destacadas, últimas noticias y artículos de opinión,
 * permitiendo que la página Home sea puramente estructural.
 */
export const useHome = () => {
  const t = useTranslations('home');

  // Estructuramos el contenido de la sección destacada
  const featuredSection: FeaturedSectionContent = {
    title: t('featuredNews'),
    primary: featuredPrimary,
    secondary: [featuredSecondary[0], featuredSecondary[1], featuredGrid[0]] as [NewsArticle, NewsArticle, NewsArticle],

    grid: [featuredGrid[1], featuredGrid[2]],
  };



  return {
    featuredSection,
    latestNews: latestNews,
    opinionArticles,
    // Aquí podríamos añadir lógica de "Última Hora" dinámica en el futuro
  };
};
