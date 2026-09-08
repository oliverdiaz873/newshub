'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <button
      className="nh-btn"
      type="button"
      onClick={() => {
        void logout().then(() => router.push('/login'));
      }}
    >
      Salir
    </button>
  );
}
