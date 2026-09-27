import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Uploaded covers are served as absolute API URLs (see apps/api media
 * module); next/image requires an explicit remote pattern for those.
 * Derived from NEXT_PUBLIC_API_URL so no hostname is hardcoded; legacy
 * relative paths need no configuration. Production host comes from env.
 * The dev fallback applies when the variable is unavailable while this
 * config is evaluated (observed in `next dev`); production must set
 * NEXT_PUBLIC_API_URL explicitly.
 */
function mediaRemotePattern() {
  try {
    const raw = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').trim();
    if (!raw) return undefined;
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return [{ protocol: url.protocol.replace(':', '') as 'http' | 'https', hostname: url.hostname, port: url.port || undefined, pathname: '/api/v1/media/**' }];
  } catch {
    return undefined;
  }
}

const mediaPattern = mediaRemotePattern();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(mediaPattern
    ? {
        images: {
          remotePatterns: mediaPattern,
          // Dev-only: the API upstream is localhost, which resolves to a
          // private IP blocked by the optimizer SSRF guard
          // (fetchExternalImage → E394 '"url" parameter is not allowed').
          // Production serves media from a public host, guard stays on.
          dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
        },
      }
    : {}),
};

export default withNextIntl(nextConfig);
