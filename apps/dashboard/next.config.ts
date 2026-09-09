import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * H5 web audit: the admin dashboard must never be framed (clickjacking
   * on authenticated editorial actions) and responses must not be
   * MIME-sniffed. No CSP here: a wrong CSP breaks Next.js inline scripts
   * and dev HMR; the API already ships full helmet headers.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
