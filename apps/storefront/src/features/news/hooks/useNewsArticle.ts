import { useParams } from 'next/navigation';
// Importaciones directas para evitar fallos de resolución de módulos (Barrel files)
import { politicaArticles } from '../../../data/articleContent/politica';
import { deporteArticles } from '../../../data/articleContent/deporte';
import { economiaArticles } from '../../../data/articleContent/economia';
import { internacionalArticles } from '../../../data/articleContent/internacional';
import { justiciaArticles } from '../../../data/articleContent/justicia';
import { climaArticles } from '../../../data/articleContent/clima';
import { saludArticles } from '../../../data/articleContent/salud';
import type { FullNewsArticle } from '../../../data/newsModels';

/**
 * useNewsArticle
 * 
 * Hook ultra-robusto con importaciones directas.
 */
export const useNewsArticle = () => {
  const { category, slug } = useParams<{ category?: string; slug?: string }>();
  
  const normalize = (str: string) => 
    str?.normalize("NFD")
       .replace(/[\u0300-\u036f]/g, "")
       .toLowerCase()
       .trim() || "";

  // Limpiar el slug de barras laterales
  const cleanSlug = (slug || "").replace(/^\/+|\/+$/g, "");
  const normSlug = normalize(cleanSlug);
  
  const allArticles: FullNewsArticle[] = [
    ...(politicaArticles || []), 
    ...(deporteArticles || []), 
    ...(economiaArticles || []), 
    ...(internacionalArticles || []), 
    ...(justiciaArticles || []), 
    ...(climaArticles || []), 
    ...(saludArticles || [])
  ];
  
  // Búsqueda por slug puro (el slug es único en el sistema de archivos)
  const article = allArticles.find((item) => {
    const itemHref = normalize(item.href);
    const itemId = normalize(item.id);
    
    // El slug debe coincidir con el final del href o con el ID
    return itemHref.endsWith('/' + normSlug) || itemId === normSlug || itemId.includes(normSlug);
  });

  return {
    article,
    categoryName: article?.category || category || "",
    categorySlug: normalize(category || ""),
    slug: normSlug,
    totalLoaded: allArticles.length
  };
};
