'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { useCategory, FeaturedNewsSection, LatestNewsSection, OpinionSidebar } from '@/features/news';
import type { CategoryPageContent } from '@/data/newsModels';
import { NewsLayout } from '@/shared/layouts';
import { useCategoryTranslation } from '@/features/news/hooks/useCategoryTranslation';


/**
 * Category Page - Client Component
 *
 * Página que orquestra la visualización de una sección de noticias (Salud, Deporte, etc.).
 *
 * F2.2 category API-first: the server-resolved content (API composition)
 * takes precedence; the local hook remains only as the development
 * fallback when the server could not resolve from the API
 * (NEXT_PUBLIC_API_URL unset). The sidebar shows API opinions
 * (GET /opinions?limit=3); sidebarNews.ts is no longer a render source.
 *
 * Componentes usados:
 * - NewsLayout: Estructura de dos columnas (Main + Sidebar).
 * - OpinionSidebar: Barra lateral con opiniones del API.
 * - FeaturedNewsSection: Grid de noticias destacadas de la categoría.
 * - LatestNewsSection: Listado inferior de noticias adicionales.
 */
export const Category = ({ initialContent }: { initialContent?: CategoryPageContent | null }) => {
  const { content: rawContent } = useCategory();
  const content = useCategoryTranslation(initialContent ?? rawContent);
  const t = useTranslations('news');
  const tCommon = useTranslations('common');

  // Estado: Categoría no encontrada
  if (!content) {
    return (
      <main className="min-h-[calc(100vh-200px)] px-4 py-8 md:px-[0.1rem] lg:px-4">
        <div className="mx-auto max-w-[900px] rounded-lg bg-white p-8 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:bg-gray-900">
          <p className="category-kicker text-[#dc3545] font-bold mb-2">{t('category.notFoundLabel')}</p>
          <h1 className="text-3xl font-bold mb-4 dark:text-white">{t('category.notFoundTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('category.notFoundDescription')}
          </p>
          <Link
            href="/"
            className="inline-flex rounded-md bg-[#dc3545] px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-[#b52a37]"
          >
            {tCommon('backToHome')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <NewsLayout
        className="category-layout"
        sidebar={
          <OpinionSidebar
            articles={content.opinionArticles}
          />
        }
      >
        <div className="category-page space-y-8">
          {/* Sección de noticias destacadas de la categoría */}
          <FeaturedNewsSection content={content.featuredSection} />
          
          {/* Listado de noticias adicionales si existen */}
          {content.latestNews.length > 0 && (
            <LatestNewsSection 
              title={content.latestTitle} 
              articles={content.latestNews} 
            />
          )}
        </div>
      </NewsLayout>
    </>
  );
};
