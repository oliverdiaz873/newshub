'use client';

import { useTranslations } from 'next-intl';

/**
 * BreakingNewsBadge
 * 
 * Componente visual que representa la etiqueta de "Última Hora" dentro de la marquesina.
 * Incluye un indicador rojo parpadeante para llamar la atención del usuario.
 * Está estrechamente acoplado al BreakingNewsBanner del módulo de noticias.
 */
export const BreakingNewsBadge = () => {
  const t = useTranslations('home');

  return (
    <div className="z-10 ml-2 mr-2 flex shrink-0 items-center gap-2 rounded-md bg-[#212529] px-3 py-[0.25em] text-[0.75em] font-bold uppercase">
      {t('breakingNews')}
      <span className="h-2 w-2 rounded-full bg-[#ff0000] animate-blink"></span>
    </div>
  );
};
