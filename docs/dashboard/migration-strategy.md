# Migration Strategy — mockup → real dashboard

## 1. Principle

Preserve the mockup's visual language, navigation, theme, i18n, responsive behavior, tables, pagination, sorting, search, bulk actions, validation, dirty-guard, empty states, KPI patterns, breadcrumbs, and accessibility. Adapt patterns — never copy vanilla code literally — to the existing stack: Next.js 16 + TypeScript + React 19 + REST + existing `AuthProvider/apiFetch` + App Router architecture.

## 2. What to preserve (D-UX, port logic not code)

- Shell: sidebar (drawer mobile + collapse desktop), topbar (`#global-q` proxy, theme slot, locale toggle, user chip wired to `/auth/me`), breadcrumbs with `aria-current`.
- Theme engine verbatim behavior: `newshub-theme` pref, system fallback, anti-flicker head script, 180 ms + `reduced-motion`, cross-tab sync, Sun/Moon/System icons, storefront tokens (`#1a1a1a`, `#242424/#2d2d2d`, `#404040/#4a4a4a`, `#e0e0e0/#a0a0a0`, `#dc3545`).
- i18n wiring pattern (`data-i18n`-equivalent via chosen lib, `?lang=` override, `NH_rerender` equivalent for JS rows), validation order (validate before dirty.watch), dirty snapshot exclusions, bulk ID-persistence, `?sort/?select` deep links, toast/confirm semantics, media grid and KPI CSS/SVG patterns, login split layout.

## 3. What to replace (SIM → real)

| Mockup SIM | Real replacement (existing) |
|---|---|
| `mock.js` data | `GET /editorial/*`, `GET /authors`, `GET /media` via `apiFetch` |
| `store.js` delta persistence | `POST\|PATCH /articles|/opinions/:id`, transition POSTs, `DELETE` |
| Toast-only save/publish | Real writes + `invalid_transition`/`slug_taken`/`media_in_use` mapping |
| `ObjectURL` upload | `POST /media` multipart (server 5 MB + sharp check authoritative) |
| Gradient media placeholders | `GET /media/:id/content` absolute URLs |
| Static user chip | `GET /auth/me` + silent refresh (`tryRefresh`) |
| Hardcoded login | `POST /auth/login` + HttpOnly refresh cookie + `nh_access` |
| Computed demo counts | Tier 1 computed counts from list endpoints (honest labels) |

## 4. Stack adaptation map

- Vanilla `*.js` modules → React components/hooks: `sortable` → `SortableTh` + `useSortQuery`; `pagination.js` → `Paginator` (server `meta`); `bulk.js` → `useBulkSelection`; `dirty.js` → `useDirtyGuard`; `validate.js` → schema + field validators (same regex/messages); `i18n.js` → `next-intl`-or-equivalent (`OPEN DECISION`); `store.js` → server state + optimistic UI only where safe.
- `app/*.html` pages → App Router: `/`, `/login`, `/articles`, `/articles/[id]`, `/opinions`, `/opinions/[id]`, `/media`, `/categories`, `/authors`, `/settings`, plus P1 `/planning`, `/analytics`, `/notifications`, `/audit-log`. Inline `editing` state → `[id]` routes. `window.confirm()` → ported `#confirm-dlg` equivalent.
- Styling: merge `assets/css/app.css` tokens into dashboard CSS system; add missing `@media` (380/820/1024px from mockup), dark surfaces, table scroll regions, skeleton/empty/error variants. Keep `.nh-*` class contract where tests reference it or codemod explicitly.

## 5. Architecture guardrails (locked)

Dashboard → REST only; no Prisma/PostgreSQL in dashboard; editorial reads via `GET /editorial/*` (guarded), public reads stay published-only; absolute media URLs; `helmet`/CORS/`ValidationPipe`/`ProblemExceptionFilter` untouched; no GraphQL/microservices/Nx/Turborepo. Shared UI (`Table`, `Paginator`, `Modal`, `FormField`, `EmptyState`, `Skeleton`, `MediaPicker`) built once in Increment 0 and reused — no per-page forks.

## 6. Data-migration note

No content migration exists in this phase: mockup data is fictitious (`mock.js`) and never imported. Real content comes from PostgreSQL via API. If demo seeding is later needed, it is a separate authorized task with fixtures — not part of migration.

## 7. Risks

- Over-copying vanilla JS (behavioral bugs, a11y loss) — mitigate with component DoD + a11y checks.
- Promising server search/sort beyond `q`/`publishedAt` limits — mitigate with honest UI copy + docs.
- `limit=100` + double-fetch patterns persisting — mitigate by deleting in-page fetch forks in Increment 1.
- Scope creep into P1 backends during migration — mitigate with increment gates (P0 migration never adds tables/endpoints).
