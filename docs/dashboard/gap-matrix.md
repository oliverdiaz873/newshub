# Gap Matrix — Mockup vs Dashboard vs API vs DB

Legend: `EXISTS` verified / `PARTIAL` incomplete / `MISSING` absent / `MOCK ONLY` mockup-only. Priority `P0/P1/P2/P3`. Evidence paths in parentheses.

| Capability | Mockup | Dashboard | API | DB | Target | Priority |
|---|---|---|---|---|---|---|
| Shell (sidebar/topbar/breadcrumbs/theme/i18n/responsive/drawer) | EXISTS (D-UX: `app.js`, `app.css`, `i18n.js`) | EXISTS (Inc 0: drawer/collapse/toggle/switcher/`@media`, `proxy.ts` + `RequireAuth`) | — (UI) | — | Done (Inc 0) | P0 |
| Auth (login/me/refresh/logout) | EXISTS layout, SIM auth (`login.html`) | EXISTS client (`src/lib/auth.tsx`, `app/login/page.tsx`, per-field errors) | EXISTS (`auth.controller.ts`, `tokens.ts`, argon2, throttles) | EXISTS (`users`, `user_credentials`, `refresh_tokens`) | Done (Inc 0) | P0 |
| RBAC | SIM chip (`Elena/editora`) | PARTIAL (gating via `RequireAuth`; `admin==editor`, no ownership) | PARTIAL (`@Roles admin,editor`, `admin==editor`, no ownership) | `User.role` string (extensible values) | Target model in `permissions.md` | P0 model, P1 enforcement |
| Articles list/filters | EXISTS (status/curation/q/sort/pager/bulk SIM) | EXISTS server-wired (Inc 1: `q`/sort/page/bulk/`?select`, default 20) | EXISTS filters + PARTIAL q/sort | EXISTS | Done (Inc 1) | P0 |
| Article editor + validation + dirty-guard | EXISTS (`validate.js`, `dirty.js`, tabs, cover select SIM) | EXISTS (`/articles/[id]`, shared `MediaPicker`, validate-first, unpublish-first) | EXISTS writes + transitions + 422/409 codes | EXISTS (+ unique `(locale,slug)`) | Done (Inc 1) | P0 |
| Featured / Breaking | EXISTS badges+filter | EXISTS checkboxes+filter | PARTIAL (articles only + partial indexes) | PARTIAL (articles cols only) | Keep articles-only | P0 |
| Opinions | EXISTS (no bulk by design) | EXISTS list + `/opinions/[id]` + `OpinionEditor` (Inc 3) | EXISTS (author-required, no flags) | EXISTS (`opinions` + translations, author `RESTRICT`) | Done (Inc 3) | P0 |
| Categories | EXISTS shell + SIM form + `slug_taken` demo | EXISTS inline CRUD + article-grade validation + `articleCount` (Inc 3) | EXISTS (+ `articleCount`, delete-blocked) | EXISTS | Done (Inc 3) | P0 |
| Authors | EXISTS shell + SIM form | EXISTS inline CRUD + validation, no fabricated counts (Inc 3) | EXISTS editorial-only (no public list by design) | EXISTS (articles `SET NULL`, opinions `RESTRICT`) | Done (Inc 3) | P0 |
| Media upload/preview/metadata | EXISTS grid/upload SIM (ObjectURL, 5 MB sim) | EXISTS manager (Inc 4: grid, server pager, client `q`, upload, Copy-URL, `media_in_use`) + shared `MediaPicker` | EXISTS core (5 MB, sharp MIME match, `media_in_use`, immutable content route) | EXISTS (`media_assets`) | Done v1 (Inc 4); usage detail P2 DAM | P0 core, P2 DAM |
| Search `q` | EXISTS client (title/slug/cat/author) | EXISTS articles/opinions server `q` (honest hint); taxonomies/media client filter | PARTIAL (title/summary `ILIKE+unaccent`, no rank/FTS) | `unaccent` ext only | Done (Inc 1/3/4) | P0 |
| Pagination | EXISTS client slice (5/10/25) | EXISTS server `page/limit` (10/20/50, default 20); catalogs client-paged | EXISTS (`page/limit` max 100 + `meta`) | — | Done (Inc 1/3/4) | P0 |
| Sorting | EXISTS client (title/status/category) | EXISTS server `publishedAt` select | PARTIAL (`publishedAt` only) | — | Done; extensions deferred | P0 |
| Editorial workflow | EXISTS actions SIM (toasts/confirms) | EXISTS gated by client mirror + `reject` + queue quick actions (Inc 2, H0) | EXISTS matrix (`transitions.ts` incl. `reject`) + `publishedAt`-once | EXISTS (`status`, `published_at`) | Done (Inc 2) | P0 |
| Scheduling | MOCK ONLY affordance | EXISTS (Inc 5: Scheduled view, editor picker, list badges, countdown/overdue) | EXISTS (`scheduledAt/scheduledBy`, schedule/cancel, `?scheduled/?overdue`, cron executor) | EXISTS (`scheduled_at/by` + partial indexes) | Done (Inc 5) | P1 build |
| Revisions | MISSING | MISSING | MISSING (in-place overwrite) | MISSING | New (see `revisions.md`) | P1 |
| Audit Log | MISSING | MISSING | MISSING (only `createdBy/updatedBy`) | MISSING | New (see `audit-log.md`) | P1 |
| Planning/assignments/calendar | MOCK ONLY review-queue (hardcoded) | MISSING | MISSING | MISSING | New (see `planning.md`) | P1 |
| Notifications | MISSING (toasts ≠ system) | MISSING | MISSING | MISSING | New (see `notifications.md`) | P1 |
| Analytics | MOCK ONLY numbers, D-UX layout | MISSING | MISSING (only `articleCount`) | MISSING | Tier 1 counts now, Tier 2 events later | P1 |
| SEO editorial controls | PARTIAL (fields, no meter) | PARTIAL (fields inline) | EXISTS fields | EXISTS fields | Completeness meter `UI/UX ONLY` | P0 |
| Settings | EXISTS (session/API/density SIM) | MISSING | Session only; prefs local | — | Shell + local prefs first | P0 shell, P1+ persistence decision |
| Distribution (newsletter/push/RSS/sitemap) | MISSING | MISSING | MISSING | MISSING | P2+ only | P2/P3 |

## Reading the matrix

Migrate directly from mockup: shell, theme, i18n pattern, tables, sort/pager/bulk patterns, validation, dirty-guard, toasts/confirms, media grid, KPI layout, login layout. Needs wiring to existing backends: all P0 rows marked `EXISTS` under API. Needs new backend: scheduling, revisions, audit, planning, notifications, analytics Tier 2, distribution. `OPEN DECISION` items: page-size default, sort extensions, bulk endpoint, rejection action shape, scheduling executor/model, revision retention/compare, analytics library, notification channels, planning model, canonical handling, media `bytes`/search/usage-detail.
