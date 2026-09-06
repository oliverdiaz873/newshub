'use client';

import { Link, usePathname } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { navItems } from '../../config/navItems';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * TabletNav
 * 
 * Navegación principal optimizada para tablets (768px - 1023px).
 * Diseño horizontal más compacto con fuentes ligeramente más pequeñas para evitar desbordes.
 */
export const TabletNav = () => {
  const t = useTranslations('navbar');
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const menuId = 'tablet-categories-menu';

  const homeItem = useMemo(() => navItems.find((i) => i.path === '/') ?? navItems[0], []);
  const categoryItems = useMemo(() => navItems.filter((i) => i.path !== '/'), []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setIsOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <nav
      ref={wrapperRef}
      aria-label={t('tabletNavLabel')}
      className="hidden md:flex lg:hidden justify-center"
    >
      <ul className="m-0 flex list-none items-center gap-1 p-0">
        {homeItem && (
          <li key={homeItem.nameKey}>
            <Link
              href={homeItem.path}
              onClick={() => setIsOpen(false)}
              className={
                `block rounded px-2 py-1.5 text-[14px] font-sans text-black transition-all duration-300 dark:text-[var(--color-text-primary)] ${
                  pathname === homeItem.path
                    ? 'bg-[#ebebeb] text-[#dc3545] dark:bg-[#ebebeb] dark:text-black'
                    : 'hover:text-[#dc3545] dark:hover:text-[#dc3545]'
                }`
              }
            >
              {t(homeItem.nameKey)}
            </Link>
          </li>
        )}

        <li className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={menuId}
            onClick={() => setIsOpen((v) => !v)}
            className="block rounded bg-transparent px-2 py-1.5 font-sans text-[14px] text-black transition-all duration-300 hover:text-[#dc3545] dark:text-[var(--color-text-primary)] dark:hover:text-[#dc3545]"
          >
            {t('categories')} <span className="text-[0.75em] opacity-80">▼</span>
          </button>

          <ul
            id={menuId}
            role="menu"
            className={`absolute left-0 top-full mt-1 min-w-[220px] list-none rounded-lg bg-white p-1 shadow-xl dark:bg-[#111] ${
              isOpen ? 'block' : 'hidden'
            }`}
          >
            {categoryItems.map((item) => (
              <li key={item.nameKey} role="none">
                <Link
                  href={item.path}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  className={
                    `block rounded px-3 py-2 text-[14px] font-sans transition-all duration-200 ${
                      pathname === item.path
                        ? 'bg-[#ebebeb] text-[#dc3545] dark:bg-[#ebebeb] dark:text-black'
                        : 'text-black hover:bg-black/5 hover:text-[#dc3545] dark:text-[var(--color-text-primary)] dark:hover:bg-white/10 dark:hover:text-[#dc3545]'
                    }`
                  }
                >
                  {t(item.nameKey)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </nav>
  );
};
