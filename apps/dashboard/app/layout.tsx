import type { Metadata } from 'next';
import { AuthProvider } from '@/shared/api/auth';
import { ThemeProvider } from '@/shared/lib/theme';
import { themeInitScript } from '@/shared/lib/theme-script';
import { LocaleProvider } from '@/shared/lib/i18n';
import { ToastProvider } from '@/shared/components/Toasts';
import { Shell } from '@/shared/components/Shell';
import '../src/app.css';

export const metadata: Metadata = {
  title: 'Newshub Dashboard',
  description: 'Editorial dashboard (administrators only).',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <ToastProvider>
                <Shell>{children}</Shell>
              </ToastProvider>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
