'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { AuditBoard } from '@/features/audit/components/AuditBoard';

export default function AuditLogPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <AuditBoard />
      </Suspense>
    </RequireAuth>
  );
}
