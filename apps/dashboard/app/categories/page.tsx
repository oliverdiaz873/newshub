'use client';

import { RequireAuth } from '@/shared/components/RequireAuth';
import { CategoryManager } from '@/features/categories/components/CategoryManager';

export default function CategoriesPage() {
  return (
    <RequireAuth>
      <CategoryManager />
    </RequireAuth>
  );
}
