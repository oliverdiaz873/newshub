'use client';

import { RequireAuth } from '@/shared/components/RequireAuth';
import { AuthorManager } from '@/features/authors/components/AuthorManager';

export default function AuthorsPage() {
  return (
    <RequireAuth>
      <AuthorManager />
    </RequireAuth>
  );
}
