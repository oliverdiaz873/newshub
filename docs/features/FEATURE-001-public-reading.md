# FEATURE-001: Public Reading (Storefront → REST API, published only)

Status: Proposed (approved as first functional slice, not implemented)

## Description
Integrate public reading of published content (categories, articles, opinions) from
`GET /api/v1/...` progressively, preserving the existing Next.js storefront
behavior. No rewrite of pages, components, layouts, i18n, SEO, or styles.
Reuse before rewrite. Search `q` is basic (`ILIKE`-level contract) in this slice,
not a full search system.

This is F1 in the approved sequence F1 → F2 → F3 → F4 → F5.

## Requirements
- Functional:
  - List categories, list + detail articles, list + detail opinions (published only).
  - Detail lookup by `(locale, slug)` with `?locale > Accept-Language > es` priority.
  - Fallback ES → EN at API level with `localeResolved + fallback` flags.
  - Pagination (`page/limit`, max 100), ordering `publishedAt:desc`, filters
    `category/author/q`, `ETag` + `Cache-Control: public, s-maxage=60, SWR=300`.
  - `DTOs ≠ tables`, `camelCase` API / `snake_case` DB, `firstPublishedAt` immutable.
- Non-functional:
  - Visual/functional parity with current frontend (no regression).
  - Public surface never exposes `draft`; `401 vs 403` strict; `409 slug_taken`.
- Out of scope for F1: editorial CRUD, publish/unpublish UI, `apps/dashboard`
  functional, Prisma/PG implementation, definitive search, preview URLs,
  sessions/permissions/comments/analytics.

## Acceptance Criteria
- [ ] `GET /api/v1/articles?locale=en&page=1&limit=20` returns `200`, `meta.total`,
      items with `localeResolved/fallback`, only `published`, `ETag` present.
- [ ] `GET /api/v1/articles/:slug?locale=en` without EN row returns `200` ES body
      with `fallback:true`; missing in both locales returns `404 code:not_found`.
- [ ] Categories/opinions equivalents behave the same way.
- [ ] Storefront pages render identical content via adapter with fallback flag
      handled (no blank pages, no locale-bleed URLs).
- [ ] `q` basic filter works without changing the contract shape.
- [ ] No `GET /authors/:slug` public endpoint in v1 (authors embedded only).
- [ ] `cover.url` usable without exposing storage internals; upload/delete remain
      editorial-only (later slices).

## Design
- Solution approach: progressive data adapter inside `apps/storefront`
  (post Slice-0 move). Current `src/data/*` stays as fallback/fixtures.
  Adapter keeps the same function signatures (`useNewsArticle`,
  `categoryContent` shape) and swaps the source from local TS to
  `fetch ${BASE}/api/v1/...` with ISR. `sitemap.ts` / `robots.ts` unchanged
  in behavior; `proxy.ts` locale logic untouched.
- Affected components: data-access layer only (`src/data/*` + future
  `lib/api-client`), `app/[locale]/*` pages keep JSX/CSS/i18n/SEO as is.
- Data changes: none in F1 (reads Data Model v2 locked shape, does not migrate it).
- Backward compatibility: local data remains until adapter is validated per route.

## Implementation Plan
1. Slice-0 first: move frontend → `apps/storefront`, integrate `docs/`, adapt
   `tsconfig/tailwind/next-intl` paths, keep `src/data`, verify gates.
2. Add read-only API client + adapter with `locale/fallback/pagination` handling.
3. Migrate route by route (home → category → article → opinions → search → legal),
   validating parity after each.
4. Wire `ETag`/`Cache-Control` + `X-Locale-Fallback` handling in storefront fetch.
5. Keep `q` as pass-through basic filter; no search tuning in F1.

## Testing Strategy
- Unit: adapter mapping (DTO → view model), locale priority, fallback flags,
  pagination meta parsing.
- Integration: contract tests against mocked `/api/v1` (published-only,
  `404/409/401/403` semantics, `localeResolved/fallback`).
- E2E (when `apps/e2e` exists, blocking on high-risk PRs): home → category →
  article, search es/en, direct `/:slug` with missing EN (fallback banner),
  no `draft` leakage.
- Manual: responsive, SEO metadata, images, legal/opinions, no console errors,
  Lighthouse no-regression.

## Dependencies
- Locked: ADR-001..008, ADR-009 direction (O2), Data Model v2, API Contract v1.1.
- Requires Slice-0 structural move before adapter work.
- Blocked later slices (F2–F5) depend on F1 read path, not vice versa.

## Risks and Mitigations
- Risk: interpreting F1 as page rewrite → Mitigation: parity checklist + diff
  limited to data-access files, visual review per route.
- Risk: expanding `q` into full search → Mitigation: contract-stable basic
  filter only; full-text deferred to API Contract evolution.
- Risk: locale-bleed URLs (`/en` showing ES without flag) → Mitigation:
  mandatory `localeResolved/fallback` assertions in integration tests.
- Risk: `draft` leakage → Mitigation: public client never sends auth; tests assert
  `draft` invisible without editorial token.

## Notes
- `firstPublishedAt` semantics locked (first publication, immutable).
- `breadcrumb`/`relatedNews` derived, not persisted.
- `legal/home/sidebar` stay out of MVP tables.
- `GET /authors/:slug` and public preview remain explicitly out of v1.
