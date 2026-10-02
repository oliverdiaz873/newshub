import type { Metadata } from 'next';
import Script from 'next/script';
import { AuthProvider } from '@/shared/api/auth';
import { ThemeProvider } from '@/shared/lib/theme';
import { themeInitScript } from '@/shared/lib/theme-script';
import { LocaleProvider } from '@/shared/lib/i18n';
import { ToastProvider } from '@/shared/components/Toasts';
import { ShellSwitch } from './shell-switch';
import '../src/app.css';

export const metadata: Metadata = {
  title: 'Newshub Dashboard',
  description: 'Editorial dashboard (administrators only).',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: { url: '/favicon.ico', type: 'image/x-icon' },
    apple: { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script id="nh-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <ToastProvider>
                <ShellSwitch>{children}</ShellSwitch>
              </ToastProvider>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
