'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { NotificationsBoard } from '@/features/notifications/components/NotificationsBoard';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <NotificationsBoard />
      </Suspense>
    </RequireAuth>
  );
}
