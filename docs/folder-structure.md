# Folder Structure

This document describes the monorepo structure that is relevant to development and maintenance.

> Scope note (R-2): this file previously described a single Next.js app at the
> repository root. That layout no longer exists. Each app below keeps its own
> `package.json` + `package-lock.json`; there is no root `package.json` and no
> npm workspaces — install and run commands per app (see `getting-started.md`).

## Root

```text
.
|-- apps/
|   |-- api/
|   |-- dashboard/
|   |-- e2e/
|   `-- storefront/
|-- docs/
|-- scripts/
|-- .github/
|-- LICENSE
|-- README.md
|-- tsconfig.tsbuildinfo
`-- .gitignore
```

- `apps/`: the four applications (below).
- `docs/`: project documentation — `architecture.md`, `folder-structure.md`
  (this file), `getting-started.md`, `source-of-truth.md`,
  `technical-debt.md`, plus `adr/`, `features/`, `dashboard/`,
  `storefront/`, `runbooks/`.
- `scripts/`: repo-level guards — `ssot-guard.mjs` (ADR-012 boundary),
  `audit-gate.mjs`, `audit-filter-guard.mjs`. No global build script.
- `.github/`: CI workflows (`workflows/ci.yml`; merges stay manual).
- `tsconfig.tsbuildinfo`: stale build artifact at root (no root `tsconfig.json`
  consumes it); harmless, kept out of scope.

Generated or dependency directories may also be present locally
(`node_modules/` per app, `.next/` in Next.js apps, `.git/`).

## `apps/api` — NestJS editorial API

```text
apps/api/
|-- prisma/
|   |-- schema.prisma
|   |-- seed.ts
|   |-- seed-data/
|   `-- migrations/        # 15 applied (PostgreSQL, SSOT persistence)
|-- src/
|   |-- modules/           # articles/ auth/ authors/ categories/ editorial/
|   |                       # history/ media/ notifications/ opinions/
|   |                       # planning/ scheduling/ syndication/
|   |-- prisma/            # PrismaService (PrismaModule)
|   |-- health/
|   |-- common/            # transitions, guards helpers, pagination, locale
|   `-- main.ts            # global prefix api/v1, helmet, CORS, ValidationPipe
|-- test/                  # API e2e (jest-e2e, TEST_DATABASE_URL); unit specs live in src/
|-- scripts/               # backup.mjs, restore.mjs, drill.mjs, lib.mjs
|-- docs/                  # business-rules.md, data-model-*.md, syndication-retention.md
|-- .env / .env.example    # DATABASE_URL, TEST_DATABASE_URL, PORT=3001, JWT_*
`-- package.json           # dev/build/start, type-check, test, test:e2e,
                           # prisma:generate/migrate/seed, backup/restore
```

Layering per feature: Controller → Service → Repository → PostgreSQL
(via `PrismaService`). Canonical data docs live in `apps/api/docs/`.

## `apps/dashboard` — editorial back-office (Next.js)

```text
apps/dashboard/
|-- app/                   # thin routing + composition (articles/ authors/
|                          # categories/ media/ planning/ scheduled/
|                          # notifications/ opinions/ audit-log/ analytics/
|                          # syndication/ forbidden/ login/ settings/ …)
|                          # + layout.tsx, page.tsx, robots.ts,
|                          # dashboard-shell.tsx, shell-switch.tsx, nav-counts.ts
|-- features/              # domain modules incl. editorial-shared/
|-- shared/                # api/ components/ lib/ (UI only, no domain)
|-- src/                   # app.css + messages/ (no legacy code)
|-- proxy.ts               # routing hygiene only (API enforces auth)
|-- public/                # brand/, fonts/, favicons
|-- .env.example           # NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
|                          # (+ NEXT_PUBLIC_STOREFRONT_URL=http://localhost:3000)
`-- package.json           # dev/start on :3002, build, lint, type-check
```

Dependency direction `app → features → shared` (`shared → features`
forbidden); `editorial-shared` is transversal (HistoryPanel, LocaleTabs,
transitions, validators) and never imports domain features. Rulebook:
`docs/dashboard/feature-architecture.md`.

## `apps/storefront` — public site (Next.js, API-first)

```text
apps/storefront/
|-- app/
|   |-- layout.tsx / robots.ts / sitemap.ts
|   `-- [locale]/          # layout, page, error, loading, not-found, providers,
|                          # category/, news/, opiniones/, search/, legal/,
|                          # fixed sections (clima, deporte, economia,
|                          # internacional, justicia, politica, salud),
|                          # _lib/, _components/
|-- src/
|   |-- features/          # navigation/ news/ (components, hooks, services)
|   |-- shared/            # components, layouts, config, utils
|   |-- data/              # newsModels.ts + index.ts (types, no content data)
|   |-- i18n/              # routing.ts, request.ts, locales/{es,en}/
|   |-- lib/               # api.ts (reads NEXT_PUBLIC_API_URL, already /api/v1)
|   |-- styles/ theme/ assets/ ui/
|-- messages/              # compiled next-intl output (generated)
|-- public/                # favicons, images
|-- scripts/               # build-locales.ts
|-- proxy.ts               # next-intl middleware
`-- package.json           # dev/build run build:locales first; start, lint,
                           # type-check
```

Content comes from `NEXT_PUBLIC_API_URL` (already includes `/api/v1`;
`next.revalidate: 60`); `src/data` holds types only (ADR-012 quarantine;
`ssot-guard.mjs` enforces the boundary). When the variable is unset, the
storefront renders from the local static data layer (development
fallback); fetch failures otherwise reach the error boundary. i18n:
`src/i18n/locales/{locale}/*.json` → `build:locales` →
`messages/{locale}.json`.

## `apps/e2e` — centralized Playwright harness

```text
apps/e2e/
|-- tests/                 # 20 specs (UI + direct API setup/cleanup)
|-- fixtures/              # auth.ts (role sessions, rate-limit safe)
|-- playwright.config.ts   # baseURL :3212; spins API :3211 + dashboard :3212
|                          # + storefront :3210 against newshub_e2e
|-- global-setup.ts        # asserts DB name newshub_e2e, migrate deploy + seed
|-- scripts/pretest.cjs    # frees 3210-3212, wipes e2e storage
|                          # (its .next cleanup targets apps/e2e/<app>/.next,
|                          # which does not exist — real .next trees in
|                          # apps/storefront, apps/dashboard are untouched;
|                          # code fix out of scope, tracked via PR)
|-- docs/                  # coverage.md, mcp/{README,architecture}.md
|-- mcp.config.json        # E2E root (mcp/ holds prompts only; exploration only)
`-- package.json           # pretest, test (playwright), mcp:start, type-check, lint
```

## `docs`

```text
docs/
|-- architecture.md        # system architecture (this project, high level)
|-- folder-structure.md    # this file
|-- getting-started.md     # per-app setup (verified commands)
|-- source-of-truth.md     # authority hierarchy + conflict resolution
|-- technical-debt.md      # deferred items with evidence (TD-XXX)
|-- adr/                   # ADR-009…016 + README
|-- features/              # FEATURE-001…005 + README
|-- dashboard/             # 20 feature/runbook docs (see feature-architecture.md)
|-- storefront/            # feature-architecture.md
`-- runbooks/              # backup-restore, dependency-audit, web-audit
```

Specialized docs are canonical for their area — root docs link to them
instead of duplicating them.
