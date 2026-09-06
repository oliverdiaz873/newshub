'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { navItems } from '../../config/navItems';

/**
 * DesktopNav
 * 
 * Navegación principal optimizada para pantallas grandes (>= 1024px).
 * Diseño horizontal amplio.
 */
export const DesktopNav = () => {
  const t = useTranslations('navbar');
  const pathname = usePathname();

  return (
    <nav aria-label={t('desktopNavLabel')} className="hidden lg:block">
      <ul className="m-0 flex list-none items-center p-0">
        {navItems.map((item) => (
          <li key={item.nameKey}>
            <Link
              href={item.path}
              className={
                `block rounded px-2 py-2 text-[16px] font-sans text-black transition-all duration-300 dark:text-[var(--color-text-primary)] ${
                  pathname === item.path
                    ? 'bg-[#ebebeb] text-[#dc3545] dark:bg-[#ebebeb] dark:text-black'
                    : 'hover:text-[#dc3545] dark:hover:text-[#dc3545]'
                }`
              }
            >
              {t(item.nameKey)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
