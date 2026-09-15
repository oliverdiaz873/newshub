'use client';

import { Suspense } from 'react';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { ArticleList } from '@/features/articles/components/ArticleList';

export default function ArticlesPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingFallback />}>
        <ArticleList />
      </Suspense>
    </RequireAuth>
  );
}
