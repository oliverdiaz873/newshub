import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Uploaded covers are served as absolute API URLs (see apps/api media
 * module); next/image requires an explicit remote pattern for those.
 * Derived from NEXT_PUBLIC_API_URL so no hostname is hardcoded; legacy
 * relative paths need no configuration. Production host comes from env.
 */
function mediaRemotePattern() {
  try {
    const raw = process.env.NEXT_PUBLIC_API_URL;
    if (!raw) return undefined;
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return [{ protocol: url.protocol.replace(':', '') as 'http' | 'https', hostname: url.hostname, port: url.port || undefined }];
  } catch {
    return undefined;
  }
}

const mediaPattern = mediaRemotePattern();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(mediaPattern ? { images: { remotePatterns: mediaPattern } } : {}),
};

export default withNextIntl(nextConfig);
