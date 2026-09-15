'use client';

import { RequireAuth } from '@/shared/components/RequireAuth';
import { SettingsBoard } from '@/features/settings/components/SettingsBoard';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsBoard />
    </RequireAuth>
  );
}
