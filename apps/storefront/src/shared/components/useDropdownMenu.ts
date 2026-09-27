'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Shared dropdown open/close behavior (Theme + Language): hover with 200ms
 * close delay + click toggle + outside mousedown + Escape.
 *
 * Coordination: hook instances share a module-level registry of the
 * currently open dropdown. Opening one instantly closes any other open
 * one (no close animation) so Theme ↔ Language switches never overlap;
 * normal closes (outside, Escape, trigger, option select) keep the
 * 130ms ease-in animation and openings keep 170ms ease-out.
 */

let openDropdownId: string | null = null;
const openDropdownListeners = new Set<(openId: string | null) => void>();

export function useDropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();
  const id = useId();

  const open = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setInstant(false);
    setIsOpen(true);
    openDropdownId = id;
    openDropdownListeners.forEach((listener) => listener(id));
  };

  const close = () => {
    setInstant(false);
    setIsOpen(false);
    if (openDropdownId === id) openDropdownId = null;
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  useEffect(() => {
    const onSwitch = (openId: string | null) => {
      if (openId !== null && openId !== id) {
        // Another dropdown opened: close immediately (no animation).
        setInstant(true);
        setIsOpen(false);
      }
    };
    openDropdownListeners.add(onSwitch);
    return () => {
      openDropdownListeners.delete(onSwitch);
      if (openDropdownId === id) openDropdownId = null;
    };
  }, [id]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    isOpen,
    instant,
    rootRef,
    menuId,
    open,
    close,
    toggle,
    scheduleClose: () => {
      hoverTimeoutRef.current = setTimeout(() => close(), 200);
    },
  };
}
