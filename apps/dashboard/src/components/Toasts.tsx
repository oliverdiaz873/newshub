'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastKind = 'ok' | 'err' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastState | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3300);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  const polite = toasts.filter((toast) => toast.kind !== 'err');
  const assertive = toasts.filter((toast) => toast.kind === 'err');
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="nh-toasts" role="status" aria-live="polite">
        {polite.map((toast) => (
          <div key={toast.id} className={`nh-toast nh-toast-${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>
      <div className="nh-toasts nh-toasts-alert" role="alert">
        {assertive.map((toast) => (
          <div key={toast.id} className={`nh-toast nh-toast-${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastState {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider.');
  return ctx;
}
