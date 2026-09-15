'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Dirty-guard (ports mockup dirty.js). Compares a JSON snapshot of the form
 * value against a clean baseline. Rebaseline ONLY after a validated,
 * successful save — never on failed Save/Publish.
 */
export function useDirtyGuard<T>(value: T): {
  dirty: boolean;
  markClean: () => void;
  reset: (next: T) => void;
} {
  const [baseline, setBaseline] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== baseline;

  const markClean = useCallback(() => {
    setBaseline(JSON.stringify(value));
  }, [value]);

  const reset = useCallback((next: T) => {
    setBaseline(JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return { dirty, markClean, reset };
}
