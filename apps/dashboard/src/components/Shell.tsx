'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

/**
 * Dashboard shell: sidebar (drawer on mobile, collapse on desktop) +
 * topbar + content region. Global search proxies to the current view via
 * a CustomEvent so lists own their filtering (mockup #global-q pattern).
 * Drawer keyboard contract (mockup parity): opening moves focus to the
 * first nav link; Escape or scrim closes and returns focus to the menu
 * button.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const menuRef = useRef<HTMLButtonElement | null>(null);
  // Link navigation moves focus to the new page; only Escape/scrim close
  // returns focus to the menu button.
  const restoreRef = useRef(true);

  const handleQuery = useCallback((value: string) => {
    setQuery(value);
    window.dispatchEvent(new CustomEvent('nh:global-search', { detail: value }));
  }, []);

  const closeWithoutRestore = useCallback(() => {
    restoreRef.current = false;
    setNavOpen(false);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    restoreRef.current = true;
    document.querySelector<HTMLElement>('.nh-sidebar a, .nh-sidebar button')?.focus();
    const menuButton = menuRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (restoreRef.current) menuButton?.focus();
    };
  }, [navOpen]);

  return (
    <div className={navOpen ? 'nh-app nav-open' : 'nh-app'}>
      <Sidebar onNavigate={closeWithoutRestore} />
      {navOpen && <div className="nh-scrim" aria-hidden="true" onClick={() => setNavOpen(false)} />}
      <div className="nh-main">
        <Topbar
          onMenu={() => setNavOpen((open) => !open)}
          query={query}
          onQuery={handleQuery}
          menuRef={menuRef}
          menuExpanded={navOpen}
        />
        <div className="nh-content">{children}</div>
      </div>
    </div>
  );
}
