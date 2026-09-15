# Dashboard Overview

## 1. What the dashboard must be

The Newshub Dashboard is the internal editorial CMS for Newshub: authenticated staff create, review, schedule, publish, archive, and measure news content in Spanish (`es`, required) and English (`en`, optional). It serves Admin, Editor, Author/Writer, and Reviewer roles (see `permissions.md`) and consumes the NestJS REST API (`/api/v1`) as its only application source. It is not a public site (storefront is separate) and must send `robots: noindex` (already `EXISTS` via `apps/dashboard/app/robots.ts` + `layout.tsx` metadata).

## 2. Scope by priority

### P0 — Editorial core (MVP)

Dashboard/Overview, Articles, Opinions, Categories, Authors, Media, Search, Authentication, RBAC (admin/editor equivalence today, role model target defined), i18n (data `es+en`; UI ES-only today → EN/ES target), Theme (light/dark/system target), Responsive, Editorial workflow (`draft/review/published/archived` + transitions `publish/unpublish/archive/restore`), Breaking/Featured flags (articles only today), Scheduling (concept defined; `MISSING` in backend), Revisions/version history (concept defined; `MISSING`), Basic auditability (`createdBy/updatedBy`; full log `MISSING`).

### P1 — Newsroom

Review/Approval queue, Editorial planning/assignments/calendar (`MISSING`), Notifications (`MISSING`), Audit Log (`MISSING`), Analytics v1 (computed counts first; event infra later), Content health/SEO controls (`UI/UX ONLY` + `API REQUIRED` for completeness signals), Distribution controls (scope-limited; full syndication is P2+).

### P2 — Advanced newsroom

Live coverage/live blogs, advanced DAM (variants, focal point, alt library, CDN), collaboration (comments, mentions), syndication/RSS/sitemap/webhooks, newsletters, push distribution, advanced analytics, AI-assisted editorial tools (draft assist, translation suggestions — always human-approved).

### P3 — Future / enterprise (only with clear justification)

Monetization, paywall, advanced personalization, complex workflow orchestration, external syndication infrastructure, advanced collaboration infrastructure. Not MVP requirements.

## 3. Current state summary (evidence) — updated through Increment 5

- Dashboard: App Router shell (sidebar/drawer/collapse, topbar, breadcrumbs, `proxy.ts` + `RequireAuth`, `/forbidden`, `/settings`), `next-intl` EN/ES UI + separate editorial preview language, light/dark/system theme, responsive + a11y-hardened shared kit (`Table/Paginator/States/Modal/Toasts/MediaPicker/MediaCard/LocaleTabs`). Articles + opinions: server-wired lists (`q`/filters/`publishedAt` sort/pagination, bulk articles, scheduled badges) + `[id]`/`new` editors (validation-first, dirty-guard, unpublish-first, full transitions incl. `reject`, scheduling picker in review). Categories/authors: inline CRUD with article-grade validation. Media manager: grid + server pagination + client filter + upload + Copy-URL + `media_in_use`. Scheduled view (`/scheduled`) with countdown/overdue. Overview: Tier-1 KPIs + mixed review queue with quick actions.
- API: Articles/Opinions/Categories/Media/Auth/Pagination/Scheduling `EXISTS`. Featured/Breaking `PARTIAL` (articles only). Search/Sorting/RBAC `PARTIAL`. Revisions/Audit/Notifications/Assignments/Analytics/Distribution `MISSING`.
- DB: `schema.prisma` + `scheduled_at/by` columns and partial indexes on articles/opinions. No tables for revision/audit/notification/assignment/analytics/distribution.
- Mockup: full UX reference (unchanged, frozen). Behavior classified D-UX / SIM / API / NEW in `ui-ux-specification.md` and `gap-matrix.md`.

## 4. Target architecture

```text
Dashboard → REST (/api/v1) → NestJS → Prisma → PostgreSQL
```

Rules: no direct DB access from dashboard; no Prisma in dashboard; `GET /editorial/*` (any status, guarded `@Roles('admin','editor')`, `editorial.controller.ts`) for editing vs public published-only reads; absolute media URLs via `coverUrl`; `helmet`, CORS (dashboard+storefront), `ValidationPipe`, `ProblemExceptionFilter`, `CacheControlInterceptor` (`main.ts`) preserved. No GraphQL, microservices, Nx, or Turborepo without audited justification (`OPEN DECISION`: none currently justified).

## 5. Engineering requirements (from first increment)

TypeScript strict (`tsc --noEmit`), ESLint (`eslint-config-next`), `next build`, Playwright (P1+), a11y (focus, `aria-sort`, confirm dialog, reduced-motion), responsive, i18n EN/ES, light/dark, API contract adherence (problem+json codes: `invalid_transition`, `slug_taken`, `media_in_use`, `file_too_large`), loading/empty/error states, security (HttpOnly refresh cookie, `SameSite=lax`, `Secure` in prod, throttling `1000/min` default + `10/min login`), auditability.

## 6. Portfolio value (summary; full in `roadmap.md`)

Highest value: clean Dashboard↔REST↔Prisma layering, editorial state machine, RBAC evolution path, bilingual translation model, media integrity (`media_in_use`, sharp-verified MIME), scheduling/revision/audit designs, production-quality UX migration (sortable tables, pagination, validation, dirty-guard, a11y, i18n, theming), testing discipline. Visual effects alone are explicitly deprioritized.
