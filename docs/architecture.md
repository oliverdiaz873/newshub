# Architecture

## Overview

Newshub is a monorepo with four apps that evolve independently:

```text
apps/api         NestJS + PostgreSQL + Prisma — editorial API (REST /api/v1)
apps/dashboard   Next.js — editorial back-office (feature-based)
apps/storefront  Next.js 16 App Router — bilingual public news site
apps/e2e         Playwright — centralized E2E harness (isolated database)
```

Data direction (ADR-012, status `Proposed` — implemented in substance,
formal gates G0–G4 and `src/data` deletion F6 still pending):

```text
PostgreSQL (persistence source of truth)
  ↓
Prisma (mirrors the physical model)
  ↓
NestJS API (/api/v1, sole application-facing source of truth)
  ↓
Storefront / Dashboard (API clients, never direct DB access)
```

Each app installs and runs on its own (`apps/<name>/package.json`; no root
`package.json`, no workspaces). Ports — dev vs E2E differ intentionally:

| Service | Development | E2E harness |
|---|---|---|
| API | `:3001` | `:3211` |
| Dashboard | `:3002` | `:3212` |
| Storefront | `:3000` | `:3210` |

Canonical detail lives in specialized docs (linked per section, not
duplicated here): API/data → `apps/api/docs/`; dashboard →
`docs/dashboard/`; E2E/coverage/MCP → `apps/e2e/docs/`; decisions → `docs/adr/`.

## API (`apps/api`)

NestJS modular monolith organized by features (`src/modules/`: articles,
opinions, categories, authors, editorial, media, planning, scheduling,
notifications, history, syndication, auth), plus `PrismaModule`, health,
scheduling and throttling. Global prefix `api/v1`, helmet, CORS restricted
to dashboard/storefront origins, `ValidationPipe`, JWT access (15 min) +
httpOnly refresh rotation with reuse detection, role guards
(`admin, editor, reviewer`).

Layering per feature: **Controller → Service → Repository → PostgreSQL**
via `PrismaService`. Repositories own all Prisma access; the frontend never
touches the database (`scripts/ssot-guard.mjs` enforces the boundary).

## Dashboard (`apps/dashboard`)

Next.js back-office with `app/` (thin routing + composition), `features/`
(domain modules incl. transversal `editorial-shared`: history panel,
locale tabs, scheduling, validators) and `shared/` (UI only, no domain).
Dependency direction `app → features → shared` (`shared → features`
forbidden). Rulebook: `docs/dashboard/feature-architecture.md`.
Dev on `:3002` (E2E serves it on `:3212`).

## Storefront (`apps/storefront`)

Next.js `16` App Router bilingual (015, `es` default via `next-intl`) public
site, **API-first**: pages fetch `GET {NEXT_PUBLIC_API_URL}/api/v1`
(`next.revalidate: 60`); `src/data/` holds only TypeScript types under
ADR-012 quarantine (boundary enforced, deletion gate F6 pending). Home is
API-only — fetch failure reaches the error boundary, never stale local data.
Detail routes keep `notFound()` semantics; `next/image` uses remote patterns
derived from the API URL.

Routes under `app/[locale]/`: home, 7 fixed + 1 dynamic category pages,
news detail (`news/[category]/[slug]`), opinion detail (`opiniones/[slug]`),
search, legal (privacy/terms), plus `sitemap.ts`/`robots.ts`.

i18n pipeline (unchanged, still local): static `src/i18n/locales/{locale}/*.json`
+ `scripts/build-locales.ts` (runs before `dev`/`build`) → `messages/{locale}.json`
consumed by `next-intl` (`routing.ts`, `request.ts`, `proxy.ts` middleware).

Layout/theming: root layout (html, fonts, theme script) + locale layout
(locale validation, `NextIntlClientProvider`, Header/Footer, ScrollToTop);
custom theme system (`light/dark/system`) in `src/theme/`; Server Components
by default with client islands (theme, nav, search); Tailwind + co-located CSS.

## E2E (`apps/e2e`)

Centralized Playwright harness: `playwright.config.ts` spins API `:3211` +
dashboard `:3212` + storefront `:3210` against an isolated `newshub_e2e`
database (name asserted in `global-setup.ts`, migrate + deterministic seed).
`pretest.cjs` cleans build output, e2e storage and ports. Specs mix UI flows
with direct-API setup/cleanup; role sessions avoid the login rate limit.
Coverage matrix and residual risks: `apps/e2e/docs/coverage.md`.

Playwright MCP exists solely as exploration/debugging infrastructure
(minimal `mcp.config.json`, read-only prompts, never in CI — see
`apps/e2e/docs/mcp/README.md`).

## Database

PostgreSQL is the persistence source of truth; Prisma mirrors it
(`prisma migrate deploy`, `prisma generate`, `tsx prisma/seed.ts`;
14 migrations applied). Documented end to end in `apps/api/docs/`:
business rules (BR-001…BR-023), conceptual/logical/physical models,
retention policy (BR-023: terminal webhook deliveries 30 days, actives
never). Locales are data (`locales` table); content translations are weak
entities; history (`revisions`/`audit_events`) is append-only and survives
content deletion by design.
