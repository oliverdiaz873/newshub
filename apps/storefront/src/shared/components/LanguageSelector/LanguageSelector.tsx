'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { WorldIcon, ChevronDownIcon } from '../icons/Icons';

const languages = [
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' },
];


/**
 * LanguageSelector - Versión Premium (estilo Hypermarket)
 * 
 * Un selector de idiomas profesional unificado para todas las vistas con:
 * - Menú desplegable animado via Tailwind Animate
 * - Accesibilidad completa
 * - Estética moderna con glassmorphism
 */
export const LanguageSelector = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale || 'es';
  }, [locale]);

  const changeLanguage = (lng: string) => {
    if (locale !== lng) {
      const query = searchParams.toString();
      router.replace(
        query ? `${pathname}?${query}` : pathname,
        { locale: lng }
      );
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}
      onMouseEnter={() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsOpen(true);
      }}
      onMouseLeave={() => {
        hoverTimeoutRef.current = setTimeout(() => setIsOpen(false), 200);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-transparent dark:border-white/10 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <WorldIcon className="w-4 h-4 shrink-0" />
        <span className="uppercase" style={{ fontFamily: 'var(--font-domine)', fontSize: '13px', letterSpacing: '0.05em' }}>{currentLanguage.code}</span>
        <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 md:left-auto md:right-0 mt-2 w-40 origin-top-left md:origin-top-right bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-[16px] shadow-[var(--shadow-elevation-2)] backdrop-blur-xl p-[0.35rem] z-[1100] overflow-hidden animate-in fade-in zoom-in duration-200"
          role="menu"
        >
          <div className="flex flex-col gap-[0.25rem]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center justify-between w-full px-[0.85rem] py-[0.7rem] rounded-[12px] transition-colors duration-200 ${
                  locale === lang.code 
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-semibold' 
                    : 'text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
                role="menuitem"
              >
                <span style={{ fontFamily: 'var(--font-domine)', fontSize: '13px', letterSpacing: '0.05em' }}>{lang.nativeName}</span>

                {locale === lang.code && (
                  <svg className="w-4 h-4" style={{ fill: 'none' }} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
