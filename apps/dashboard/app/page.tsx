'use client';

import { RequireAuth } from '@/shared/components/RequireAuth';
import { OverviewBoard } from '@/features/overview/components/OverviewBoard';

export default function Home() {
  return (
    <RequireAuth>
      <OverviewBoard />
    </RequireAuth>
  );
}
