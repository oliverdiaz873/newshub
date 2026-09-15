'use client';

import { useCallback, useId, useRef } from 'react';

export type LocaleTab = 'es' | 'en';

/**
 * Shared ES/EN locale tabs with full keyboard support (ArrowLeft/Right,
 * Home/End move + activate) and tab/tabpanel wiring.
 */
export function LocaleTabs({
  tab,
  onTab,
  labelEs,
  labelEn,
  panelId,
}: {
  tab: LocaleTab;
  onTab: (tab: LocaleTab) => void;
  labelEs: string;
  labelEn: string;
  panelId: string;
}) {
  const baseId = useId();
  const esRef = useRef<HTMLButtonElement | null>(null);
  const enRef = useRef<HTMLButtonElement | null>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const order: LocaleTab[] = ['es', 'en'];
      const current = order.indexOf(tab);
      let next: LocaleTab | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const dir = event.key === 'ArrowRight' ? 1 : -1;
        next = order[(current + dir + order.length) % order.length];
      } else if (event.key === 'Home') {
        next = 'es';
      } else if (event.key === 'End') {
        next = 'en';
      }
      if (next) {
        event.preventDefault();
        onTab(next);
        (next === 'es' ? esRef : enRef).current?.focus();
      }
    },
    [tab, onTab],
  );

  function renderTab(which: LocaleTab, label: string, ref: React.RefObject<HTMLButtonElement | null>) {
    const selected = tab === which;
    return (
      <button
        ref={ref}
        className={selected ? 'nh-btn primary' : 'nh-btn'}
        type="button"
        role="tab"
        id={`${baseId}-${which}`}
        aria-selected={selected}
        aria-controls={panelId}
        tabIndex={selected ? 0 : -1}
        onClick={() => onTab(which)}
        onKeyDown={onKeyDown}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="nh-row" role="tablist" aria-label="Locales">
      {renderTab('es', labelEs, esRef)}
      {renderTab('en', labelEn, enRef)}
    </div>
  );
}
