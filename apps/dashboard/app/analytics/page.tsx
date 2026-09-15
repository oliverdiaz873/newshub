'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { AnalyticsBoard } from '@/features/analytics/components/AnalyticsBoard';

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <AnalyticsBoard />
      </Suspense>
    </RequireAuth>
  );
}
