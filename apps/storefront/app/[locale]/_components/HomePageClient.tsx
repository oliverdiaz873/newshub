'use client';

import { useHome } from '@/features/news';
import {
  BreakingNewsBanner,
  FeaturedNewsSection,
  LatestNewsSection,
  OpinionSidebar,
} from '@/features/news/components';

/**
 * Home Page
 * 
 * Representa la página principal del periódico y compone los bloques editoriales visibles en portada. 
 * Utiliza el hook useHome para centralizar la lógica de contenidos.
 * 
 * Componentes usados:
 * - BreakingNewsBanner: Marquesina de última hora.
 * - FeaturedNewsSection: Bloque principal de noticias destacadas.
 * - LatestNewsSection: Listado de noticias más recientes.
 * - OpinionSidebar: Columna lateral con artículos de opinión.
 */
export const Home = () => {
  const { featuredSection, latestNews, opinionArticles } = useHome();

  return (
    <>
      <main className="home-main min-h-[calc(100vh-200px)] px-4 py-0 pb-8 md:px-[0.1rem] lg:px-4 lg:pb-12">
      <div className="mx-auto mt-3 max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-9">
            <section className="mb-2">
              <BreakingNewsBanner />
            </section>

            <div className="space-y-8">
              <FeaturedNewsSection content={featuredSection} />
              <LatestNewsSection articles={latestNews} />
            </div>
          </div>

          <div className="lg:col-span-3">
            <OpinionSidebar articles={opinionArticles} />
          </div>
        </div>
      </div>
    </main>
    </>
  );
};
