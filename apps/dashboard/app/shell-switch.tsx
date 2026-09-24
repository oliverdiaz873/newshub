'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell } from './dashboard-shell';

/**
 * App-layer shell switch (composition root helper). The login route renders
 * standalone (mockup parity: centered brand + card, no sidebar/topbar),
 * every other route keeps the dashboard shell.
 */
export function ShellSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}
