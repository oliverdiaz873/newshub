'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { opinionArticles, type OpinionArticle } from '../../../../data';
import { useArticleTranslator } from '../../hooks/useArticleTranslation';
import '../RecentNewsSidebar/RecentNewsSidebar.css';

interface OpinionSidebarProps {
  title?: string;
  articles?: OpinionArticle[];
}

/** Representa una barra lateral editorial reusable para home y categorias. */
export const OpinionSidebar = ({ title, articles: rawArticles = opinionArticles }: OpinionSidebarProps) => {
  const translateArticle = useArticleTranslator();
  const t = useTranslations('home');
  
  const articles = rawArticles.map(translateArticle);

  const sectionTitle = title ?? t('opinion');

  return (
    <aside className="font-sans">
      <section className="rounded-lg border-l border-[#ddd] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:border-[var(--color-border-subtle)] dark:bg-[var(--color-surface-elevated)]">
        <h3 className="section-title-home section-title-sidebar mb-3 text-2xl font-bold dark:text-[var(--color-text-primary)]">{sectionTitle}</h3>

        <div className="space-y-6">
          {articles.map((article) => (
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
                <p className="text-sm leading-[1.6] text-[#495057] dark:text-[var(--color-text-primary)]">{article.summary}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
};
