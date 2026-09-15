'use client';

import { use } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ArticleDetail } from '@/features/articles/components/ArticleDetail';

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <ArticleDetail id={id} />
    </RequireAuth>
  );
}
