'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { navItems } from '../../config/navItems';

/**
 * MobileNav
 * 
 * Navegación optimizada para dispositivos móviles (< 768px).
 * Diseño puramente vertical, pensado para vivir dentro de un menú lateral (drawer) o acordeón.
 */
export const MobileNav = ({ onItemClick }: { onItemClick?: () => void }) => {
  const t = useTranslations('navbar');
  const pathname = usePathname();

  return (
    <nav aria-label={t('mobileNavLabel')} className="md:hidden">
      <ul className="m-0 flex list-none flex-col p-0 space-y-1">
        {navItems.map((item) => (
          <li key={item.nameKey}>
            <Link
              href={item.path}
              onClick={onItemClick}
              className={
                `block rounded-lg px-4 py-3 text-[16px] font-sans text-black transition-all duration-300 dark:text-[var(--color-text-primary)] ${
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
