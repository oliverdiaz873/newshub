'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Breadcrumb } from '@/features/navigation/components';
import { RecentNewsSidebar, ArticleDetail } from '@/features/news';
import { NewsLayout } from '@/shared/layouts';
import { useArticleTranslator } from '@/features/news/hooks/useArticleTranslation';
import type { FullNewsArticle } from '@/data/newsModels';


/**
 * Article Page - Client Component
 *
 * Página que orquestra la visualización de una noticia individual.
 * Recibe el artículo resuelto por el servidor (API-only, Fase 4) y mantiene
 * un diseño limpio delegando el render a los componentes de presentación.
 *
 * F1.1 detail API-first: the server-resolved article (API-first) is the
 * body source, including `relatedNews` from `detail.related`.
 * F4.0 API-only: no local fallback; the server guarantees initialArticle
 * (notFound/throw otherwise).
 *
 * Componentes usados:
 * - Breadcrumb: Navegación jerárquica (Inicio > Categoría > Noticia).
 * - NewsLayout: Estructura de dos columnas.
 * - RecentNewsSidebar: Barra lateral con noticias relacionadas.
 * - ArticleDetail: Componente que renderiza el cuerpo y metadatos de la noticia.
 */
export const Article = ({ initialArticle }: { initialArticle?: FullNewsArticle | null }) => {
  const translateArticle = useArticleTranslator();
  const base = initialArticle ?? undefined;
  const article = translateArticle(base);
  // Category data comes from the API article href (/news/<category>/<slug>).
  const hrefParts = (article?.href ?? '').split('/').filter(Boolean);
  const categorySlug = hrefParts[1] ?? '';
  const categoryName = article?.category ?? '';
  const t = useTranslations('news');
  const tCommon = useTranslations('common');
  const tData = useTranslations('data');

  // Estado: Noticia no encontrada
  if (!article) {
    return (
      <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
        <div className="mx-auto max-w-[900px] rounded-lg bg-white p-8 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:bg-gray-900">
          <p className="article-category">{t('notFound.label')}</p>
          <h1 className="article-title">{t('notFound.title')}</h1>
          <p className="article-summary mb-6">
            {t('notFound.description')}
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
      <Breadcrumb 
        home={t('breadcrumbHome')}
        category={tData.has(`categories.${categorySlug}.label`) ? tData(`categories.${categorySlug}.label`) : categoryName}
        categoryPath={`/category/${categorySlug}`}
        current={article?.breadcrumb?.current || article?.title || ""}
      />
      
      <NewsLayout
        className="article-layout"
        sidebar={
          <RecentNewsSidebar 
            title={t('relatedNews')}
            articles={article.relatedNews || []}
          />
        }
      >
        <ArticleDetail article={article} />
      </NewsLayout>
    </>
  );
};
