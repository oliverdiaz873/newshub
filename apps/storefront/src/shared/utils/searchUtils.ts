/**
 * Utilidades para el sistema de búsqueda global.
 * Basado en patrones de normalización avanzados.
 */

/**
 * Normaliza un texto eliminando tildes, caracteres especiales y convirtiendo a minúsculas.
 * Útil para comparaciones de búsqueda insensibles a acentos.
 * 
 * @param text - El texto a normalizar
 * @returns El texto normalizado
 */
export const normalizarTexto = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Verifica si un término de búsqueda es válido (no vacío y longitud mínima).
 * 
 * @param query - El término buscado
 * @returns True si es válido
 */
export const hasSearchQuery = (query: string | null): boolean => {
  return !!query && query.trim().length >= 2;
};

/**
 * Compara si un texto contiene un término de búsqueda, ambos normalizados.
 * 
 * @param source - El texto donde buscar (ej: título de noticia)
 * @param query - El término buscado
 * @returns True si hay coincidencia
 */
export const matchesSearchQuery = (source: string, query: string): boolean => {
  if (!query) return false;
  const normalizedSource = normalizarTexto(source);
  const normalizedQuery = normalizarTexto(query);
  return normalizedSource.includes(normalizedQuery);
};
