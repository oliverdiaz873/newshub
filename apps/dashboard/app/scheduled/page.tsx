'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { ScheduledList } from '@/features/scheduling/components/ScheduledList';

export default function ScheduledPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <ScheduledList />
      </Suspense>
    </RequireAuth>
  );
}
