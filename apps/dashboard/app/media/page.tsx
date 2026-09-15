'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { MediaManager } from '@/features/media/components/MediaManager';

export default function MediaPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <MediaManager />
      </Suspense>
    </RequireAuth>
  );
}
