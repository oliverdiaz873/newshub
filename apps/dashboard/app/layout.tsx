import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthProvider } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import '../src/app.css';

export const metadata: Metadata = {
  title: 'Newshub Dashboard',
  description: 'Editorial dashboard (administrators only).',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <div className="nh-shell">
            <header className="nh-topbar">
              <strong>Newshub · Editorial</strong>
              <nav>
                <Link href="/articles">Artículos</Link>
                <Link href="/opinions">Opiniones</Link>
                <Link href="/categories">Categorías</Link>
                <Link href="/authors">Autores</Link>
                <Link href="/media">Media</Link>
                <Link href="/login">Acceder</Link>
                <LogoutButton />
              </nav>
            </header>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
