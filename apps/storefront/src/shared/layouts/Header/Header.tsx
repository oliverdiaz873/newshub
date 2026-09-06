'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { MenuIcon, CloseIcon } from '../../components/icons';
import logoImg from '../../../assets/images/logo/logo.jpg';
import { DesktopNav, TabletNav, MobileNav } from '../../../features/navigation/components';
import { SearchBar, ThemeToggle, LanguageSelector } from '../../components';

/**
 * Header
 * 
 * Componente de cabecera global.
 * Gestiona el menú móvil y contiene la navegación principal, búsqueda, cambio de tema y selector de idioma.
 */
export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations('navbar');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header-main">
      <nav className="header-shell">
        <div className="header-bar">
          <div className="shrink-0">
            <Link href="/" className="header-brand" aria-label={t('goToHomepage')}>
              <Image src={logoImg} alt="Logo NewsHub" className="header-brand-logo" priority />
              <h1 className="header-brand-title">NewsHub</h1>
            </Link>
          </div>

          <div className="header-desktop">
            <DesktopNav />
            <TabletNav />
            <div className="header-actions">
              <SearchBar />
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>

          <div className="flex items-center lg:hidden">
            <button
              onClick={toggleMenu}
              type="button"
              className="header-mobile-toggle"
              aria-expanded={isMenuOpen}
              aria-label={t('toggleNavigation')}
            >
              {isMenuOpen ? <CloseIcon className="h-8 w-8" /> : <MenuIcon className="h-8 w-8" />}
            </button>
          </div>
        </div>

        <div className={`header-mobile-panel ${isMenuOpen ? 'is-open' : 'is-closed'}`}>
          <div className="header-mobile-actions border-b border-gray-100 pb-4 mb-2 dark:border-gray-800">
            <div className="flex flex-col gap-4">
              <SearchBar onSearchComplete={() => setIsMenuOpen(false)} />
              <div className="flex flex-col items-start px-2 gap-4">
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </div>
          </div>
          <div className="header-mobile-nav">
            <MobileNav onItemClick={() => setIsMenuOpen(false)} />
          </div>
        </div>
      </nav>
    </header>
  );
};
