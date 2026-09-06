import type { Metadata } from 'next';
import Script from 'next/script';
import { domine } from '@/shared/config/fonts';
import { themeScript } from '@/theme/theme-script';
import { SITE_URL } from '@/shared/config/site';
import '@/theme/theme.css';
import '@/styles/index.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={domine.variable}>
      <body>
        <Script id="theme-script" strategy="beforeInteractive">{themeScript}</Script>
        {children}
      </body>
    </html>
  );
}
