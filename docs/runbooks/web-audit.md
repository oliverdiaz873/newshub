# Web Audit Record (H5, part 2) — 2026-09-09

Audit-first: live evidence, critical-only fixes. No Lighthouse CI, no
performance tuning in this item.

## Headers (live, dev servers)

| Header | API (helmet) | Storefront | Dashboard |
|---|---|---|---|
| Content-Security-Policy | ✅ `default-src 'self'` … | — | — |
| Strict-Transport-Security | ✅ | — (dev, no TLS) | — (dev, no TLS) |
| X-Frame-Options | ✅ SAMEORIGIN | — | ✅ SAMEORIGIN (added here) |
| X-Content-Type-Options | ✅ nosniff | — | ✅ nosniff (added here) |
| Referrer-Policy | ✅ no-referrer | — | — |
| COOP / COEP-CORP | ✅ | — | — |

Notes:

- API ships the full helmet set; nothing to change.
- Dashboard (admin, authenticated editorial actions) now sends
  `X-Frame-Options: SAMEORIGIN` + `X-Content-Type-Options: nosniff` via
  `next.config.ts` `headers()`. Deliberately no CSP: a wrong CSP breaks
  Next.js inline scripts and dev HMR.
- Storefront (public content) left unchanged: no authenticated actions to
  clickjack, and framing policy for news content is a product decision,
  not a hardening gap at this stage.

## SEO technical (live)

- `/sitemap.xml`: 118 URLs, references from `robots.txt` ✅; seed API
  slug present (H3 integration vigente ✅).
- Article page: `canonical` ✅, `<html lang="es">` ✅, `<title>` ✅.
- **Gap found + fixed:** detail pages (`news`, `opiniones`, `category`)
  set only `canonical`, which **replaces** the layout `alternates` in
  Next.js — hreflang was missing on every article/opinion/category page
  (verified: zero `rel="alternate"` in live HTML). Added
  `languages: { es, en, x-default }` mirroring the sitemap convention.
- Dashboard: `noindex` meta ✅ + `robots.txt: Disallow: /` ✅.

## Exceptions

- No CSP on Next.js apps (breakage risk > benefit here).
- No storefront framing headers (product decision pending).
- No HSTS on dev (no TLS locally; production TLS terminates upstream).
