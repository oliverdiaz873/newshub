'use client';

import { use } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { OpinionDetail } from '@/features/opinions/components/OpinionDetail';

export default function EditOpinionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <OpinionDetail id={id} />
    </RequireAuth>
  );
}
