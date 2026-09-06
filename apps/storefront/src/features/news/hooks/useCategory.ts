import { useParams } from 'next/navigation';
import { categoryContent } from '../../../data/categories';
import type { CategoryPageContent } from '../../../data/newsModels';

/**
 * Hook personalizado para obtener los datos de una categoría específica.
 * 
 * Abstrae la lógica de useParams y el acceso al diccionario de datos,
 * permitiendo que el componente de la página sea puramente declarativo.
 * 
 * @returns {Object} Un objeto que contiene los datos de la categoría o null si no existe.
 */
export const useCategory = () => {
  const { slug } = useParams<{ slug?: string }>();
  
  // Obtenemos el contenido basado en el slug de la URL
  const content: CategoryPageContent | undefined = slug ? categoryContent[slug] : undefined;

  return {
    content,
    slug,
    categoryName: content?.label || '',
    isValid: !!content
  };
};
