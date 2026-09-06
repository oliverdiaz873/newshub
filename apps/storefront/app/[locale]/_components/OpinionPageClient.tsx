'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Breadcrumb } from '@/features/navigation/components';
import { RecentNewsSidebar, ArticleDetail, useOpinion } from '@/features/news';
import { NewsLayout } from '@/shared/layouts';
import { useArticleTranslator } from '@/features/news/hooks/useArticleTranslation';
import type { ArticleContent, OpinionArticle } from '@/data/newsModels';

/**
 * Opinion Page - Client Component
 * 
 * Página que orquestra la visualización de una columna de opinión individual.
 * Utiliza la misma plantilla que las noticias para mantener la consistencia visual.
 *
 * F1 adapter: accepts API-sourced article + sidebar; falls back to the local
 * hooks when absent (see src/lib/api.ts).
 */
export const Opinion = ({
  initialArticle,
  initialSidebar,
}: {
  initialArticle?: ArticleContent | null;
  initialSidebar?: OpinionArticle[] | null;
}) => {
  const translateArticle = useArticleTranslator();
  const { article: localArticle, sidebarOpinions: localSidebar } = useOpinion();
  const rawArticle = initialArticle ?? localArticle;
  const rawSidebar = initialSidebar ?? localSidebar;
  const article = translateArticle(rawArticle);
  const sidebarOpinions = rawSidebar?.map(translateArticle) || [];
  const t = useTranslations('news');
  const tCommon = useTranslations('common');

  // Estado: Opinión no encontrada
  if (!article) {
    return (
      <main className="min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4">
        <div className="mx-auto max-w-[900px] rounded-lg bg-white p-8 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:bg-gray-900">
          <p className="text-[#dc3545] font-bold mb-2">{t('opinion.notFoundLabel')}</p>
          <h1 className="text-3xl font-bold mb-4 dark:text-white">{t('opinion.notFoundTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('opinion.notFoundDescription')}
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
        category={t('opinion.breadcrumbCategory')}
        categoryPath="/"
        current={article.title}
      />
      
      <NewsLayout
        sidebar={
          <RecentNewsSidebar 
            title={t('opinion.sidebarTitle')}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            articles={sidebarOpinions as any}
          />
        }
      >
        <ArticleDetail article={article} />
      </NewsLayout>


    </>
  );
};
