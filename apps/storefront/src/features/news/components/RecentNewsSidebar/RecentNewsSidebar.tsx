'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import type { NewsArticle } from '../../../../data';
import { useArticleTranslator } from '../../hooks/useArticleTranslation';
import './RecentNewsSidebar.css';

interface RecentNewsSidebarProps {
  title?: string;
  articles: NewsArticle[];
}

/**
 * RecentNewsSidebar
 * 
 * Este componente es el Sidebar de la página.
 * Muestra una lista vertical de noticias relacionadas o recientes,
 * permitiendo al usuario seguir navegando por temas similares sin volver a la portada.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} [props.title] - Título que aparecerá en la cabecera del sidebar.
 * @param {NewsArticle[]} props.articles - Arreglo de noticias a mostrar en la lista.
 * @returns {JSX.Element} El componente de barra lateral.
 */
export const RecentNewsSidebar = ({ title, articles: rawArticles }: RecentNewsSidebarProps) => {
  const translateArticle = useArticleTranslator();
  const t = useTranslations('news');
  // Traducción y límite de artículos
  const recentArticles = rawArticles.slice(0, 5).map(translateArticle);

  const sectionTitle = title ?? t('recentNews');

  return (
    <aside className="recent-news-sidebar font-sans">
      <section className="rounded-lg border-l border-[#ddd] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:border-[var(--color-border-subtle)] dark:bg-[var(--color-surface-elevated)]">
        <h3 className="section-title-home section-title-sidebar mb-3 text-2xl font-bold dark:text-[var(--color-text-primary)]">{sectionTitle}</h3>

        <div className="space-y-6">
          {recentArticles.map((article) => (
            <article
              key={article.id}
              className="recent-news-card rounded-lg p-2 transition-all duration-300 hover:translate-x-[5px]"
            >
              <Link href={article.href} className="block text-inherit no-underline">
                <div className="recent-news-image-wrapper relative mb-2 w-full overflow-hidden rounded-lg">
                  <Image
                    src={article.imageUrl}
                    alt={article.alt}
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                </div>
                <h4 className="mb-2 text-[0.95rem] font-bold leading-[1.3] text-[#212529] transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]">
                  {article.title}
                </h4>
                <div className="metadata">
                  <time dateTime={article.datetime}>{article.date}</time>
                </div>
                <p className="text-sm leading-[1.6] text-[#495057] dark:text-[var(--color-text-primary)]">
                  {article.summary}
                </p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
};
