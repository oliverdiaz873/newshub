'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { OpinionList } from '@/features/opinions/components/OpinionList';

export default function OpinionsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <OpinionList />
      </Suspense>
    </RequireAuth>
  );
}
