'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { PlanningBoard } from '@/features/planning/components/PlanningBoard';

export default function PlanningPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <PlanningBoard />
      </Suspense>
    </RequireAuth>
  );
}
