# Roadmap — independent increments

Order below is the proposal after audit (highest unblock-value first; P1 backends sequenced by dependency: revisions+scheduling need workflow solid; audit benefits from all emitters; planning/notifications/analytics last among P1). Each increment lists objective, scope, touched areas, API/DB needs, risks, dependencies, Quality Gates, and Definition of Done.

## Increment 0 — Dashboard foundation / shell

- Objective: port mockup shell so every later increment builds on real layout, theme, i18n, and shared components.
- Scope: App Router shell (sidebar drawer/collapse, topbar, breadcrumbs), theme engine, EN/ES UI switcher, responsive breakpoints, shared `Table/Paginator/Modal/FormField/EmptyState/Skeleton/Toasts/Confirm`, `middleware.ts` + `(auth)` gating on existing roles, `/settings` shell, `/` Overview skeleton.
- Touched: `apps/dashboard/app/**`, `src/components/**`, `src/lib/**`, styles. No API/DB changes.
- Risks: vanilla copy-paste; token drift from storefront. Gates: visual parity review vs mockup, a11y pass, `type-check/lint/build`.
- DoD: theme persists + syncs tabs; locale switches; mobile drawer + desktop collapse; tables scroll; `robots noindex` retained.

## Increment 1 — Articles management (P0)

- Objective: server-wired articles list + `/articles/[id]` editor replacing inline editing.
- Scope: filters→server params, `q` (documented limits), `publishedAt` sort, server pagination (remove `limit=100`), shared `MediaPicker` v1, validation + dirty-guard port, transition buttons gated by matrix, `slug_taken`/`invalid_transition` copy.
- API/DB: none new (existing editorial + write + transition endpoints). `OPEN DECISION`: bulk endpoint (default: sequential).
- Deps: Increment 0. Risks: fake search promises; double-fetch forks. Gates: contract tests vs problem codes; responsive + a11y.
- DoD: §4 of `articles.md` satisfied; no hardcoded locale/limit.

## Increment 2 — Editorial workflow hardening (P0)

- Objective: enforce matrix in UI + define rejection path.
- Scope: button enablement from `resolveTransition` logic mirrored client-side, rejection UX decision implemented (PATCH-back vs `reject` action — closes `OPEN DECISION`), review queue widget on Overview from `status=review`, published-edit guard copy (unpublish-first).
- API/DB: only if `reject` action chosen (`API REQUIRED`, no schema change expected). Deps: Inc 1. Risks: matrix drift — mitigate with shared constant + test.
- DoD: no doomed-409 buttons; rejection reason captured (persisted only if backend chosen); queue shows age.

## Increment 3 — Opinions, Categories, Authors (P0)

- Objective: bring remaining taxonomy/opinion surfaces to article-grade quality.
- Scope: `/opinions/[id]` (no curation flags — intentional), categories/authors wired with article-grade validation, `articleCount` display, delete-blocked copy (articles-Restrict vs opinions-Restrict vs `SET NULL` semantics), no-public-authors-list preserved.
- API/DB: none new. Deps: Inc 0-1 (reuse components/picker). Risks: authors `GET /authors` response shape (`translations` array) mishandled.
- DoD: CRUD round-trips; `slug_taken` + blocked-delete copies verified; empty states.

## Increment 4 — Media / DAM v1 (P0) — DONE

- Objective: real thumbnails, picker reuse, usage handling.
- Shipped: manager grid (`/media`) via content route, server pagination (default 20, deep-link), client `q` filter (honest hint), upload input+preview, shared `MediaCard`/`MediaThumb` with `MediaPicker` (picker conduct frozen), Copy-URL (clipboard + fallback), `media_in_use` human copy, `ConfirmDialog`, i18n EN/ES. Deps: Inc 1-3.
- API/DB: none (existing contract sufficient). Deferred per plan: `bytes`/usage-detail/search-`q` (P2 DAM).
- DoD: §5 of `media.md` satisfied; upload→associate→blocked-delete verified.

## Increment 5 — Scheduling (P0 concept → P1 build) — DONE

- Objective: `scheduling.md` implemented (model + endpoints + Scheduled view + executor).
- Shipped: migration `scheduled_at/by` + partial indexes (articles + opinions); `POST /:id/schedule` (review-only, 409 otherwise; 422 past; 400 malformed) + `DELETE /:id/schedule` (idempotent); `?scheduled/?overdue` editorial filters; `@nestjs/schedule` cron executor with atomic guarded claims + retry-by-design failures (kept schedule, log + `schedule.failed` hook, overdue visibility); manual transitions cancel schedules; TZ-safe picker (local input → UTC, relative + UTC labels); Scheduled view (`/scheduled`, countdown, overdue, cancel, publish-now with preemption copy); list badges; H1 bundled (media filter counts, i18n hardcodes, 360px CSS, docs refresh).
- Deps: Inc 2 satisfied; audit hook deferred to Inc 6 (trace via `updatedBy`).
- Risks retired: executor choice (poll, no queue infra), DST (UTC + round-trip), ES-missing at execution (defensive check + retry).
- DoD: §6 of `scheduling.md` satisfied (see doc for the review-only + no-error-field amendments).

## Increment 6 — Revisions + Audit Log (P1)

- Objective: version history + immutable audit trail (combined: both are append-only event systems sharing conventions).
- Scope: `revisions` + `audit_events` migrations, emitters on all writes/transitions/schedule/media/auth events, History tab (view/diff/restore-as-new-version), `/audit-log` with filters + entity trail. Deps: Inc 1-2 (emitter points), Inc 5 (schedule events).
- Risks: snapshot size, retention, performance. Gates: immutability tests, restore-creates-new-version test, index review.
- DoD: §§5/4 of `revisions.md`/`audit-log.md`.

## Increment 7 — Review / approval + Notifications (P1)

- Objective: two-step approval (if adopted) + notification inbox.
- Scope: reviewer role semantics, approve/reject with reason, inbox + unread badge + preferences, event wiring (review/publish/schedule/assign). Deps: Inc 2, 5-6.
- API/DB: notifications tables + endpoints; possible guard updates for reviewer. Risks: channel creep — inbox first, mail/push deferred.
- DoD: `notifications.md` §4; rejection reason persisted + notified.

## Increment 8 — Planning (P1)

- Objective: implement `planning.md` (pitches/assignments/calendar/workload).
- Scope: `planning_items` model + CRUD + transitions + calendar query, `/planning` views, assignment notifications, review-queue unification. Deps: Inc 5-7.
- Risks: premature normalization; calendar complexity. Gates: scope to list+calendar first, board P2.
- DoD: assign→accept→draft-link flow; overdue surfacing; empty states.

## Increment 9 — Analytics Tier 1 + SEO completeness (P1)

- Objective: honest computed analytics + completeness meter without new infra.
- Scope: Overview KPIs from list endpoints (documented Tier 1), category counts, locale coverage, activity, SEO meter (`UI/UX ONLY`). Deps: Inc 1-3.
- Risks: metric misinterpretation — mitigate with source-tier labels. `OPEN DECISION`: chart lib (CSS/SVG default).
- DoD: every metric labeled Tier 1; no fabricated trends.

## Increment 10 — Advanced newsroom (P2+)

Candidates (each its own authorized increment, never bundled): live blogs, DAM v2 (variants/focal/CDN), collaboration, syndication/RSS/sitemap/webhooks, newsletters, push, analytics Tier 2 events, AI assist (human-approved). Each needs ADR + `API REQUIRED + DB REQUIRED` + privacy review. P3 (paywall/monetization/personalization/orchestration) only with portfolio/business justification.

## Portfolio value (why this order impresses)

Early increments prove production craft (shell/a11y/i18n/theme, REST integration, state machine, bilingual model, media integrity) before ambitious backends. Scheduling→revisions→audit→notifications→planning demonstrates systems thinking (time, history, accountability, coordination) on top of a solid CRUD core — the exact arc reviewers look for. Visual polish is the vehicle, never the claim.
