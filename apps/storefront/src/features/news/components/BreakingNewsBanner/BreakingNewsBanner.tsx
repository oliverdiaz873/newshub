'use client';

import { Link } from '@/i18n/routing';
import { featuredPrimary, featuredGrid, latestNews } from '../../../../data';
import { useArticleTranslator } from '../../hooks/useArticleTranslation';
import { BreakingNewsBadge } from './BreakingNewsBadge';

/** Obtiene los 4 artículos editorialmente seleccionados marcados como última hora */
const getBreakingNews = () => {
  const allNews = [featuredPrimary, ...featuredGrid, ...latestNews];
  return allNews.filter(article => article.isBreaking === true).slice(0, 4);
};

/** Representa el banner de "Última hora" de la home con múltiples titulares en formato ticker. */
export const BreakingNewsBanner = () => {
  const translateArticle = useArticleTranslator();
  const breakingNews = getBreakingNews();
  const translatedNews = breakingNews.map(translateArticle);

  return (
    <section className="breaking-news rounded-md">
      <div className="relative flex items-center overflow-hidden rounded-md bg-[#dc3545] text-white shadow-sm">
        <BreakingNewsBadge />

        <div className="breaking-news-content">
          <div className="breaking-news-text inline-flex items-center">
            {translatedNews.map((news, index) => (
              <span key={news.id}>
                {index > 0 && <span className="mx-4 align-middle">•</span>}
                <Link 
                  href={news.href} 
                  className="inline-flex items-center text-white no-underline hover:underline"
                >
                  <span className="align-middle" style={{fontSize: '15px', fontFamily: 'Arial, sans-serif', fontWeight: '600'}}>{news.title}</span>
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
