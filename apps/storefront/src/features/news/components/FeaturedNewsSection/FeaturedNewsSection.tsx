'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  featuredGrid,
  featuredPrimary,
  featuredSecondary,
  type FeaturedSectionContent,
  type NewsArticle,
} from '../../../../data';
import { useArticleTranslator } from '../../hooks/useArticleTranslation';

/** Muestra el bloque de metadatos editoriales de una noticia: fecha y categoria. */
const ArticleMeta = ({ article }: { article: NewsArticle }) => {
  const t = useTranslations('common');
  return (
    <p className="mb-2 text-[0.85rem] leading-[1.5] text-[#5f6871] dark:text-[var(--color-text-secondary)]">
      {t('publishedOn')} <time dateTime={article.datetime}>{article.date}</time> | {article.category}
    </p>
  );
};

/** Representa una tarjeta enlazable de noticia usada en las destacadas secundarias y en el grid. */
const CardLink = ({
  article,
  titleClassName,
  imageClassName,
}: {
  article: NewsArticle;
  titleClassName: string;
  imageClassName: string;
}) => {
  const t = useTranslations('common');
  return (
    <Link href={article.href} aria-label={t('readArticle', { title: article.title })} className="block text-inherit no-underline">
      {/* Se mantiene <img> en lugar de next/image porque:
          - El layout depende de la altura natural de la imagen
          - No hay dimensiones conocidas ni aspect-ratio consistente en todos los contextos (home vs categoría)
          - Migrar requeriría introducir restricciones de tamaño que alterarían el diseño actual
          - La estabilidad visual tiene prioridad sobre alcanzar el 100% de migración */}
      <img src={article.imageUrl} alt={article.alt} loading="lazy" className={imageClassName} />
      <h3 className={titleClassName}>{article.title}</h3>
      <ArticleMeta article={article} />
      <p className="text-[0.98rem] leading-[1.6] text-[#292f34] dark:text-[var(--color-text-primary)]">{article.summary}</p>
    </Link>
  );
};

interface FeaturedNewsSectionProps {
  content?: FeaturedSectionContent;
}

/** Renderiza un bloque editorial destacado reusable para portada y categorias. */
export const FeaturedNewsSection = ({ content }: FeaturedNewsSectionProps) => {
  const translateArticle = useArticleTranslator();
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  const rawSectionContent: FeaturedSectionContent = content ?? {
    title: t('featuredNews'),
    primary: featuredPrimary,
    secondary: [featuredSecondary[0], featuredSecondary[1], featuredGrid[0]],
    grid: [featuredGrid[1], featuredGrid[2]],
  };

  const sectionContent = {
    title: rawSectionContent.title,
    primary: translateArticle(rawSectionContent.primary),
    secondary: rawSectionContent.secondary.map(translateArticle),
    grid: rawSectionContent.grid.map(translateArticle),
  };

  const [secondary1, secondary2, secondary3] = sectionContent.secondary;

  return (
    <section className="rounded-lg bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[var(--color-surface-base)] font-sans">
      <h2 className="section-title-home section-title-main mb-4">{sectionContent.title}</h2>

      <div className="mb-2">
        <article className="featured-article-home rounded-lg p-[10px] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
          <Link
            href={sectionContent.primary.href}
            aria-label={tCommon('readArticle', { title: sectionContent.primary.title })}
            className="block text-inherit no-underline xl:flex xl:items-start xl:gap-6"
          >
            <div className="mb-4 xl:order-2 xl:mb-0 xl:w-[70%]">
              <div className="relative overflow-hidden rounded-lg aspect-video">
                <Image
                  src={sectionContent.primary.imageUrl}
                  alt={sectionContent.primary.alt}
                  fill
                  sizes="(max-width: 1280px) 100vw, 70vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
            <div className="xl:w-[35%]">
              <h3 className="mb-3 text-3xl font-semibold leading-tight text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]">
                {sectionContent.primary.title}
              </h3>
              <ArticleMeta article={sectionContent.primary} />
              <p className="text-base leading-[1.6] text-[#292f34] dark:text-[var(--color-text-primary)]">
                {sectionContent.primary.summary}
              </p>
            </div>
          </Link>
        </article>
      </div>

      <div className="mb-1 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:bg-[var(--color-surface-base)]">
          <CardLink
            article={secondary1}
            imageClassName="mb-3 w-full rounded-lg transition-transform duration-300 hover:scale-105"
            titleClassName="mb-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]"
          />
        </article>
        <article className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:bg-[var(--color-surface-base)]">
          <CardLink
            article={secondary2}
            imageClassName="mb-3 w-full rounded-lg transition-transform duration-300 hover:scale-105"
            titleClassName="mb-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]"
          />
        </article>
        <article className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:bg-[var(--color-surface-base)]">
          <CardLink
            article={secondary3}
            imageClassName="mb-3 w-full rounded-lg transition-transform duration-300 hover:scale-105"
            titleClassName="mb-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]"
          />
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sectionContent.grid.map((article) => (
          <article
            key={article.id}
            className="news-card-home h-full rounded-lg bg-white p-[10px] shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:bg-[var(--color-surface-base)]"
          >
            <CardLink
              article={article}
              imageClassName="mb-3 w-full rounded-lg transition-transform duration-300 hover:scale-105"
              titleClassName="mb-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)]"
            />
          </article>
        ))}
      </div>
    </section>
  );
};
