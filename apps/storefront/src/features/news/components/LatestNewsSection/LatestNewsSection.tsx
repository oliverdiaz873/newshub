'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { latestNews, type NewsArticle } from '../../../../data';
import { useArticleTranslator } from '../../hooks/useArticleTranslation';

interface LatestNewsSectionProps {
  title?: string;
  articles?: NewsArticle[];
}

/** Renderiza una cuadricula editorial reusable para portada y categorias. */
export const LatestNewsSection = ({ title, articles: rawArticles = latestNews }: LatestNewsSectionProps) => {
  const translateArticle = useArticleTranslator();
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  const articles = rawArticles.map(translateArticle);

  const sectionTitle = title ?? t('latestNews');

  return (
    <section className="rounded-lg bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)]">
      <h2 className="section-title-home section-title-main mb-4">{sectionTitle}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.id}
            className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:bg-[var(--color-surface-base)]"
          >
            <Link href={article.href} aria-label={tCommon('readArticle', { title: article.title })} className="block text-inherit no-underline">
              <div className="relative mb-3 overflow-hidden rounded-lg h-48 md:h-56 lg:h-48">
                <Image
                  src={article.imageUrl}
                  alt={article.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <h3 className="mb-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]">
                {article.title}
              </h3>
              <p className="mb-2 text-[0.85rem] leading-[1.5] text-[#5f6871] dark:text-[var(--color-text-secondary)]">
                {article.category} | {tCommon('publishedOn')} <time dateTime={article.datetime}>{article.date}</time>
              </p>
              <p className="text-[0.98rem] leading-[1.6] text-[#292f34] dark:text-[var(--color-text-primary)]">{article.summary}</p>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
};
