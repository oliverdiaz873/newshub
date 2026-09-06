'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { FullNewsArticle } from '../../../../data';

interface ArticleDetailProps {
  article: FullNewsArticle;
}

/**
 * ArticleDetail
 * 
 * Este componente es el núcleo de la página de noticias (el "Main").
 * Se encarga de renderizar todo el contenido de una noticia individual,
 * incluyendo el título, la fecha, el resumen, la imagen principal 
 * y los párrafos del cuerpo.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {FullNewsArticle} props.article - El objeto completo de la noticia a mostrar.
 * @returns {JSX.Element} El componente de detalle de la noticia.
 */
export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article }) => {
  const t = useTranslations('common');
  
  // Separamos el primer párrafo del resto para mejorar el diseño visual
  const [firstParagraph, ...restParagraphs] = article.content || [];

  return (
    <div className="article-wrapper font-sans shadow-sm mb-8 bg-white dark:bg-gray-900 rounded-[10px] p-[20px] md:p-[30px]">
      <article className="featured-article mb-4">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          <div className="content order-2 lg:order-1 flex-[0_0_40%] max-w-full lg:max-w-[40%]">
            <h1 className="h1 text-[30px] leading-[1.2] font-sans font-bold mb-3 dark:text-white">
              {article.title}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 italic">
              {t('publishedOn')} <time dateTime={article.datetime}>{article.date}</time> | {article.category}
            </p>
            
            {/* Resumen (Lead) */}
            <p className="text-[1.1rem] leading-[1.8] text-[#333] dark:text-[#d1d5db] text-justify">
              {article.summary}
            </p>
          </div>
          
          <div className="image-wrapper relative order-1 lg:order-2 flex-[0_0_100%] lg:flex-[0_0_60%] max-w-full lg:max-w-[60%] shadow-sm overflow-hidden rounded-[10px] aspect-video">
            <Image 
              src={article.imageUrl} 
              alt={article.alt} 
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </article>

      <div className="article-body px-1 mt-8">
        {/* Primer párrafo */}
        {firstParagraph && (
          <p className="mb-6 text-[1.1rem] leading-[1.8] text-[#333] dark:text-[#d1d5db] text-justify border-t border-gray-100 dark:border-gray-800 pt-6">
            {firstParagraph}
          </p>
        )}
        
        {/* Resto de párrafos */}
        {restParagraphs.map((paragraph, index) => (
          <p 
            key={index} 
            className="mb-6 text-[1.1rem] leading-[1.8] text-[#333] dark:text-[#d1d5db] text-justify"
          >
            {paragraph}
          </p>
        ))}
      </div>

    </div>
  );
};
