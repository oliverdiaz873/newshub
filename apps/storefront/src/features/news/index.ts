export * from './components';
export * from './hooks/useSearch';
export * from './hooks/useArticleTranslation';
export * from './hooks/useCategoryTranslation';
// NOTA: services/news-content NO se exporta aquí a propósito.
// Es server-safe (sin React) y lo consumen rutas server (pages, sitemap,
// app/_lib) vía import profundo '@/features/news/services/news-content'
// para no arrastrar hooks/componentes client al bundle server, y viceversa.
