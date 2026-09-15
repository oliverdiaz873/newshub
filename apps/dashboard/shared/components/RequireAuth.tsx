'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';

/**
 * Client-side route guard. Server middleware cannot see the HttpOnly
 * API-path refresh cookie (different origin/path), so the API stays the
 * authoritative enforcer (401) and this component handles UX redirects.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== '/login') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, pathname, router]);

  if (!ready) return <main className="nh-shell-narrow">{t('loading')}</main>;
  if (!user && pathname !== '/login')
    return <main className="nh-shell-narrow">{t('sessionRedirecting')}</main>;
  return <>{children}</>;
}
