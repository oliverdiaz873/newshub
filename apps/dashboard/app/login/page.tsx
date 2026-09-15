'use client';

import { Suspense } from 'react';
import { LoadingFallback } from '@/shared/components/LoadingFallback';
import { LoginForm } from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
