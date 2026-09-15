'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { SyndicationBoard } from '@/features/syndication/components/SyndicationBoard';

export default function SyndicationPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <SyndicationBoard />
      </Suspense>
    </RequireAuth>
  );
}
