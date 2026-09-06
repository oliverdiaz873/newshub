# ADR-009: Dashboard as Separate Next.js App

Status: Accepted
Date-Proposed: 2026-09-06
Date-Accepted: 2026-09-06
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: ADR-002 (monorepo direction), API Contract v1.1, FEATURE-002

## Context
Newshub needs an editorial UI for login, categories, authors (F2) and later
content publishing (F3-F5). Options: (O1) `/admin` route inside the storefront,
(O2) separate Next.js app in the monorepo, (O3) separate Angular + Material app.

## Decision
- `apps/dashboard`: Next.js + TypeScript, separate app from `apps/storefront`.
- Consumes exclusively the REST API (`/api/v1`); no direct PostgreSQL access.
- `noindex` + robots blocked (never indexed, never in sitemap).
- RBAC `admin | editor`; editorial login is part of F2.
- Reuse by copy first; shared `packages/*` only on proven duplication
  (ADR-002 rule: no artificial shared packages).

## Consequences
- Independent deploys/releases from the public storefront; single TS/React
  toolchain in the monorepo; E2E can target it separately.
- Second Next app to maintain (configs, CI path); admin UX work competes
  with API work in early slices.

## Alternatives Considered
- O1 admin route in storefront: rejected — couples public/admin releases,
  SEO leak risk (`/admin` indexable by mistake), shared deploy blast radius.
- O3 Angular + Material: rejected — second toolchain in the monorepo for a
  CRUD consumer; Superior already showcases Angular; no domain need.

## Open (explicitly NOT decided here)
UI library/styling for admin, hosting/domain, dashboard i18n specifics,
visual design, dashboard testing strategy.

## Notes
Direction O2 was pre-approved during planning; this record formalizes it.
