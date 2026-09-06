'use client';

import { Suspense, type PropsWithChildren } from 'react';
import { ThemeProvider } from '@/theme';

export function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
        {children}
      </Suspense>
    </ThemeProvider>
  );
}
