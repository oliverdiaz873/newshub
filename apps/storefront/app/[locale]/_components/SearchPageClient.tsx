'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { SearchIcon } from '@/shared/components/icons';

import { NewsLayout } from '@/shared/layouts';
import { useSearch } from '@/features/news/hooks/useSearch';
import { EmptyState } from '@/shared/components';
import { useArticleTranslator } from '@/features/news/hooks/useArticleTranslation';

/**
 * Search Page - Client Component
 */
export const Search = () => {
  const translateArticle = useArticleTranslator();
  const { query, results: rawResults, count, hasQuery, isEmpty } = useSearch();
  const results = rawResults.map(translateArticle);
  const t = useTranslations('search');
  const tCommon = useTranslations('common');

  return (
    <>
      <NewsLayout>
      <div className="container mx-auto pt-1 pb-2">
        {hasQuery ? (
          isEmpty ? (
            /* Vista: Sin Resultados usando el nuevo componente */
            <EmptyState 
              icon={<SearchIcon className="h-16 w-16 text-gray-400" />}
              title={t('noResults')}
              description={t('noResultsHint')}
              buttonText={tCommon('backToHomeAlt')}
              buttonLink="/"
            />
          ) : (

            /* Vista: Con Resultados */
            <>
              <div className="row mb-4 mt-0">
                <div className="col-12 border-bottom pb-3">
                  <h2 className="text-2xl font-bold">
                    {t('resultsFor')} <span className="text-[#dc3545]">"{query}"</span>
                  </h2>
                  <p className="text-muted mt-2">{t('foundCount', { count })}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 lg:gap-6">
                {results.map((article) => (
                  <article key={article.id} className="bg-white dark:bg-[#242424] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800 flex flex-col h-full p-2.5">
                    <Link href={article.href} className="no-underline text-inherit flex flex-col h-full">
                      <div className="relative w-full h-[200px] overflow-hidden rounded-t-lg">
                        <Image 
                          src={article.imageUrl} 
                          alt={article.alt} 
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <span className="inline-block bg-[#dc3545] text-white text-xs font-bold px-1.5 py-0.5 rounded mb-2 self-start uppercase">
                          {article.category}
                        </span>
                        <h3 className="text-xl font-bold mb-2 leading-tight dark:text-white">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {article.date}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 flex-grow mb-4">
                          {article.summary}
                        </p>
                        <span className="text-[#dc3545] font-bold mt-auto flex items-center gap-1 group" style={{fontSize: '15px'}}>
                          {tCommon('readMore')} 
                          <span className="transition-transform group-hover:translate-x-1">→</span>
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )
        ) : (
          /* Vista: Sin Búsqueda Activa */
          <div className="container py-5 text-center">
            <h2 className="text-2xl font-bold mb-4">{t('noActiveSearch')}</h2>
            <p className="text-muted mb-8">{t('useSearchHint')}</p>
            <Link 
              href="/" 
              className="inline-block bg-[#dc3545] text-white px-8 py-3 rounded-md font-bold hover:bg-[#c82333] transition-all no-underline"
            >
              {tCommon('backToHomeAlt')}
            </Link>
          </div>
        )}
      </div>
    </NewsLayout>
    </>
  );
};
