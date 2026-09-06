import { useParams } from 'next/navigation';
import { opinionDetails, opinionArticles } from '../../../data';

/**
 * Hook personalizado para gestionar la lógica de lectura de Artículos de Opinión.
 * 
 * Abstrae la obtención del contenido detallado basándose en el slug de la URL
 * y gestiona el contenido del sidebar con otros artículos de opinión.
 */
export const useOpinion = () => {
  const { slug } = useParams<{ slug?: string }>();
  
  // Buscamos el contenido detallado por el slug
  const article = slug ? opinionDetails[slug] : undefined;

  // Para el sidebar de opinión, mostramos los otros artículos (excluyendo el actual si es posible)
  const sidebarOpinions = opinionArticles.filter(op => !op.href.includes(slug || ''));

  return {
    article,
    sidebarOpinions,
    slug,
    isValid: !!article
  };
};
