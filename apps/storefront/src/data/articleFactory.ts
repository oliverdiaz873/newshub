import type { NewsArticle } from './newsModels';

/**
 * Función auxiliar para crear y validar objetos de tipo NewsArticle.
 * Proporciona seguridad de tipos y autocompletado al definir artículos de noticias estáticos.
 * 
 * @param article - El objeto que contiene los datos del artículo de noticias.
 * @returns El mismo objeto de artículo, validado contra la interfaz NewsArticle.
 */
export const createNewsArticle = (article: NewsArticle): NewsArticle => article;
