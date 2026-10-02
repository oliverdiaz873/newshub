# Newshub - Technical Debt

Inventory of known technical debt, backed by evidence from code and
audits on `origin/main`. Source of truth is always the current code;
this document only records what was deliberately deferred.

## Purpose

Make explicit what was intentionally left pending so future work can
resume without rediscovering context. Nothing listed here is approved
for implementation by the mere fact of being listed.

## Current Status

History + Audit Log are functionally closed (D1, D4, D5, P2-1, P2-2
merged; see Resolved Debt). Media manager is closed for now. The items
below are the remaining known debts.

## Priority Legend

- `P2` - relevant functional limitation, non-blocking (assigned by a
  prior audit; kept as-is).
- `P3` - cosmetic, minor UX, or low-impact improvement (assigned by a
  prior audit; kept as-is).
- `Priority: Unclassified` - no historical priority; needs a future
  decision before any work.
- `Deferred` / `STALE` / `RISK` are descriptive states, not rankings.

## Active Technical Debt

### TD-001 - HistoryPanel capped at 50 revisions, no pagination

- Area: History
- Priority: P3
- Status: Deferred
- Introduced by: History implementation
- Related PR/commit: history implementation (Increment 6)
- Evidence:
  `apps/dashboard/features/editorial-shared/components/HistoryPanel.tsx`
  fetches `revisions?limit=50` with no pager, show-more, or infinite
  loading. The API itself paginates normally.
- Current impact:
  Entities with more than 50 versions are not fully browsable in the UI.
- Why deferred:
  No evidence of entities approaching the cap; no editorial complaint.
- Future action:
  Only with volume evidence; prefer server-backed show-more (embedded
  panel fits it better than a full pager).
- Notes:
  Do not raise the limit blindly; check revision volume first.

### TD-002 - Single-revision endpoint has no consumer

- Area: History
- Priority: P2
- Status: Deferred
- Introduced by: History implementation
- Related PR/commit: history implementation
- Evidence:
  `GET /articles/:id/revisions/:version` and
  `GET /opinions/:id/revisions/:version` exist, are role-guarded and
  tested, but no dashboard code calls them (HistoryPanel uses the
  list; restore uses its own endpoint).
- Current impact:
  Unused public API surface, kept covered by tests.
- Why deferred:
  Deliberately kept as public API; removal was explicitly rejected.
- Future action:
  Consume it (e.g. panel "View" by id) or leave as-is. Never remove
  without a versioning decision.
- Notes:
  Do not delete this endpoint casually.

### TD-003 - Orphan revisions accumulate on content delete

- Area: History
- Priority: P3
- Status: Deferred
- Introduced by: History implementation (polymorphic revisions design)
- Related PR/commit: history implementation
- Evidence:
  `Revision` has no FK to articles/opinions
  (`apps/api/prisma/schema.prisma`, `model Revision`); deleting content
  leaves its revisions stored but unreachable (`listRevisions` 404s
  once the entity is gone, while the audit trail keeps referencing it).
- Current impact:
  Silent row growth; no user-visible effect.
- Why deferred:
  Requires a retention/orphan policy decision first (product/legal).
- Future action:
  Decide policy (cascade vs tombstone vs scheduled purge), then
  implement. See TD-004.
- Notes:
  Keep together with TD-004; do not implement cleanup ad hoc.

### TD-004 - No retention/pruning for revisions and audit events

- Area: History / Audit Log
- Priority: P3 today, RISK over time
- Status: Deferred
- Introduced by: History implementation (immutability by design)
- Related PR/commit: history implementation; retention marked
  `OPEN DECISION` since the original design docs
- Evidence:
  No pruning job, cron, TTL, or policy exists in
  `apps/api/src/modules/history/`; both tables grow unboundedly.
- Current impact:
  None at current volume; unbounded growth is a future cost/perf risk.
- Why deferred:
  Immutability was the priority; retention needs product/legal input
  (audit trail especially).
- Future action:
  Approve a retention policy first, then implement (never silent pruning).
- Notes:
  Approval required before any implementation.

### TD-005 - Audit table cells show raw codes

- Area: Audit Log (UX)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard implementation
- Related PR/commit: audit implementation; P2-2 translated only the
  filter dropdowns (deliberate scope cut)
- Evidence:
  `AuditBoard.tsx` renders `{row.action}` / `{row.entityType}` raw in
  table cells while dropdowns use translated labels.
- Current impact:
  Technical codes visible in the table; filters are translated.
- Why deferred:
  Translating stored-data display is a separate i18n decision; existing
  Playwright asserts raw cell values.
- Future action:
  Translate cells reusing the label maps, updating Playwright
  assertions accordingly.
- Notes:
  Keep raw codes as identifiers underneath regardless.

### TD-006 - Audit rows have no link to the audited entity

- Area: Audit Log (UX)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard implementation
- Related PR/commit: audit implementation
- Evidence:
  `AuditBoard.tsx` shows a truncated entity id (`slice(0, 8)`) with no
  navigation to the entity; the reverse direction exists (HistoryPanel
  deep-links into the trail).
- Current impact:
  Extra manual steps to go from event to content.
- Why deferred:
  Requires per-entity-type route mapping (article/opinion/media/user/
  planning/webhook); low value at current volume.
- Future action:
  Add entity links when the audit UI gets its next pass.
- Notes:
  None.

### TD-007 - Audit filter Apply button mislabeled

- Area: Audit Log (UX)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard implementation
- Related PR/commit: audit implementation
- Evidence:
  `AuditBoard.tsx` renders the apply button with `{t('action')}`
  ("Acción") instead of an apply/filter label; it also only resets to
  page 1 since filters apply live on change.
- Current impact:
  Confusing label; harmless behavior.
- Why deferred:
  Cosmetic; one-line change awaiting a UI pass touching this file.
- Future action:
  Add an `apply` i18n key and use it on the button.
- Notes:
  None.

### TD-008 - Audit filters do not sync to the URL

- Area: Audit Log (UX)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard implementation
- Related PR/commit: audit implementation
- Evidence:
  `AuditBoard.tsx` reads `searchParams` once on mount (deep-links
  work) but never writes filter state back (unlike MediaManager).
- Current impact:
  Filtered views are not shareable/bookmarkable after interaction.
- Why deferred:
  Deep-link entry (the HistoryPanel use case) works; full sync is a
  larger state task.
- Future action:
  Mirror the MediaManager `syncUrl` pattern when this screen is revisited.
- Notes:
  None.

### TD-009 - Invalid audit date filters silently ignored

- Area: Audit Log (UX/API)
- Priority: P3
- Status: Deferred
- Introduced by: Audit implementation
- Related PR/commit: audit implementation
- Evidence:
  `audit.service.ts` `parseDate` returns `undefined` for unparseable
  `from`/`to`, silently widening the query instead of 400.
- Current impact:
  Typos in dates return broader results without feedback.
- Why deferred:
  Dashboard sends ISO dates from date inputs; manual API misuse only.
- Future action:
  Return 400 on unparseable dates if strictness is ever wanted.
- Notes:
  Behavior change; needs a decision, not just code.

### TD-010 - Audit detail shows raw JSON metadata

- Area: Audit Log (UX)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard implementation
- Related PR/commit: audit implementation
- Evidence:
  The detail modal renders `JSON.stringify(detail.metadata)` raw.
- Current impact:
  Readable by developers, noisy for editors.
- Why deferred:
  Metadata shapes vary per action; pretty rendering is real design work.
- Future action:
  Per-action metadata renderers, only if editors ask for it.
- Notes:
  None.

### TD-011 - ES sidebar/H1 naming mismatch on Audit Log

- Area: Audit Log (UX/i18n)
- Priority: P3
- Status: Deferred
- Introduced by: AuditBoard i18n
- Related PR/commit: audit implementation
- Evidence:
  Sidebar uses `nav.auditLog` ("Registro de auditoría") while the page
  H1 uses `audit.title` ("Auditoría") in ES (EN matches: "Audit Log").
- Current impact:
  Minor inconsistency in ES navigation vs heading.
- Why deferred:
  Cosmetic; one-key change awaiting a UI/i18n pass.
- Future action:
  Align both to one term.
- Notes:
  None.

### TD-012 - MediaPicker capped at 100 assets, local search only

- Area: Media
- Priority: Unclassified
- Status: Deferred
- Introduced by: Media implementation (PR1 show-more + local filter)
- Related PR/commit: PR #60 (show-more); server search deliberately
  scoped to MediaManager only (PR #62)
- Evidence:
  `listMediaOptions` fetches a single `/media?limit=100`; the picker
  filters locally by `id + mime` only (no filename search).
- Current impact:
  Beyond 100 assets, older items are unreachable from the picker and
  unfindable by filename.
- Why deferred:
  No volume evidence; picker redesign explicitly out of scope.
- Future action:
  Requires usage evidence first; server-side picker search would be a
  dedicated increment, not a tweak. Needs approval (scope + design).
- Notes:
  Priority unclassified because the trigger (asset volume) is unknown.

### TD-013 - No cover-usage visibility in Media

- Area: Media (UX)
- Priority: Unclassified
- Status: Deferred
- Introduced by: Media v1 scope (mockup had a "Cover usage" panel)
- Related PR/commit: Media PRs #60/#61/#62
- Evidence:
  Mockup `media.html` shows per-file usage/free status; the app only
  surfaces `media_in_use` as a delete-time error. No usage endpoint
  exists by design.
- Current impact:
  Editors discover usage only when deletion is blocked.
- Why deferred:
  Needs a new endpoint (counts/flags per asset); no editorial demand
  recorded.
- Future action:
  Only with real demand; design the endpoint first.
- Notes:
  Priority unclassified; do not build speculatively.

### TD-014 - No GET /media/:id detail endpoint

- Area: Media
- Priority: P3
- Status: Deferred
- Introduced by: Media contract (deliberately excluded from PR2B scope)
- Related PR/commit: PR #62 scope decision
- Evidence:
  `media.controller.ts` exposes only list, `:id/content`, upload,
  delete. No consumer needs a detail view today.
- Current impact:
  None.
- Why deferred:
  Explicit decision: build only when a consumer appears.
- Future action:
  Revisit if/when a UI or integration needs it.
- Notes:
  Formerly "PR2C"; kept deferred, not cancelled.

### TD-015 - schedule.failed has no audit row

- Area: Scheduling/Audit (observability)
- Priority: P3
- Status: Deferred
- Introduced by: Scheduling implementation
- Related PR/commit: scheduling implementation
- Evidence:
  `scheduling.service.ts` emits `schedule.failed` as notification +
  log only; executions write audit via the publish path, failures do
  not write `AuditEvent`.
- Current impact:
  Failed scheduled executions are visible as overdue + notified, but
  leave no audit row.
- Why deferred:
  Overdue surfacing covers the operational need; audit parity is
  nice-to-have.
- Future action:
  Add a `schedule.failed` audit emission if trail completeness demands it.
- Notes:
  The board has no such filter option today either (consistent).

### TD-016 - No-op PATCH bumps updatedAt without history

- Area: History (behavior nuance)
- Priority: P3
- Status: Deferred (accepted behavior unless decided otherwise)
- Introduced by: D1 implementation (PR #64)
- Related PR/commit: PR #64 `fix(history): skip audit for noop patches`
- Evidence:
  `update()` always writes `updatedById` (bumping `updatedAt`) while
  D1 skips revision/audit when the snapshot is identical.
- Current impact:
  A row can claim "updated" with no corresponding history entry.
- Why deferred:
  Evaluated during D1: the write is real, only history is skipped.
- Future action:
  Only if `updatedAt` semantics ever need to mean "content changed";
  that would be a behavior decision, not a fix.
- Notes:
  Do not "fix" without a decision.

### TD-017 - Professional Breaking News System (future feature)

- Area: Editorial Infrastructure (future feature, not a defect)
- Priority: P2
- Status: Deferred (document now; build when active development resumes)
- Scope: Dashboard + API + Storefront + E2E
- Introduced by: N/A (deferred feature, never implemented)
- Related PR/commit: none
- Evidence (current state vs missing workflow):
  - EXISTS as presentation only: storefront
    `features/news/components/BreakingNewsBanner/` (marquee fed by an
    article list; labels "ÚLTIMA HORA"/"BREAKING NEWS") and a
    per-article `isBreaking` boolean (`schema.prisma`,
    API filters/DTOs, dashboard checkboxes, revision snapshots).
  - MISSING as an editorial system: no alert entity/table, no explicit
    editorial activation/deactivation, no expiry, no priority, no
    deterministic ordering of multiple alerts, no RBAC-gated
    management UI, no audit trail, no dedicated endpoint, no freshness
    strategy, no E2E.
  - The current banner is therefore a display surface over article
    flags, not a managed newsroom capability. References to large news
    organizations (e.g. CNN/Fox News patterns) are UX/workflow
    references only; nothing is copied from them.
- Current impact:
  Editors cannot publish, prioritize, expire, or audit breaking alerts
  as first-class objects; "breaking" is only a per-article flag.
- Why deferred:
  A correct implementation spans editorial model + API + dashboard +
  permissions + scheduling + audit + storefront freshness + E2E. A
  visual-only patch would entrench the wrong model, so this waits for
  a dedicated feature increment.
- Future action (requirements to evaluate at design time, not a build
  list): alert creation; explicit editorial activate/deactivate;
  optional article association (including alert-without-article);
  ES/EN; editorial priority; publication state; scheduling; expiry;
  role permissions; auditability; deterministic multi-alert order;
  API as data source; loading/empty/error states; responsive;
  accessibility; deterministic E2E.
- Notes:
  - Keep `Article` and `Breaking News Alert` conceptually separate: an
    article may back an alert, but breaking state must not be assumed
    from article existence alone.
  - Conceptual lifecycle only: editor activates → API validates →
    alert active → storefront receives → surface updates → alert
    expires/is deactivated/replaced → audit recorded.
  - Freshness mechanism (cache revalidation, polling, SSE,
    WebSockets) must be chosen at design time from expected update
    frequency, required latency, traffic, and operational complexity;
    no technology is pre-selected.
  - Future acceptance: dashboard-managed; documented API contract;
    fully API-driven storefront; server-side permissions; auditable
    activation; deterministic expiry; defined/tested ES/EN;
    deterministic ordering; loading/empty/error states; documented
    update strategy; relevant E2E; zero hardcoded breaking content in
    production.
  - Integrations to review before building: Articles, Planning,
    Scheduling, History, Audit Log, Auth/RBAC, storefront
    caching/revalidation, ES/EN localization, E2E.

## Deferred Improvements (volume/evidence-gated)

- TD-001 (panel pagination), TD-012 (picker scale): implement only
  with measured volume evidence, never speculatively.
- TD-014: only with a real consumer.

## Architectural Decisions Pending

- TD-003/TD-004 retention and orphan policy (product/legal approval
  required before any code).
- TD-012 picker search design (if evidence appears).
- TD-009 strict date validation (decision before code).
- TD-016 `updatedAt` semantics (decision before code).

## Documentation Debt

### TD-020 - Design docs predate the implementation

- Area: Documentation
- Priority: P3
- Status: STALE (known, untouched on purpose)
- Introduced by: implementation outpacing docs
- Related PR/commit: N/A (spans Increments 0-10)
- Evidence (verified against `origin/main` code, all still claiming
  MISSING/absent for shipped features):
  - `docs/dashboard/revisions.md:3` ("Concept only — no backend
    exists", "MISSING API + DB").
  - `docs/dashboard/audit-log.md:5` ("Runtime audit log MISSING").
  - `docs/dashboard/gap-matrix.md:22-23` (Revisions/Audit Log rows
    all MISSING) plus sibling rows (planning/notifications/analytics)
    describing shipped features as missing.
  - `docs/dashboard/roadmap.md` Increment 6 framed as future work
    (shipped); cascade staleness in `articles.md:18`,
    `dashboard-overview.md`, `information-architecture.md`,
    `opinions.md:16`, `dashboard-overview`/`permissions` role-model
    notes.
  - Counter-evidence that docs are current: `docs/adr/ADR-014`,
    `ADR-015`, `ADR-016` (D1/D5/P2-1 as built).
- Current impact:
  New readers get a wrong picture from design docs; code + ADRs are
  correct.
- Why deferred:
  Bulk doc refresh is a dedicated pass; ADRs carry the as-built truth.
- Future action:
  One documentation refresh PR marking implemented rows as DONE,
  without rewriting history of decisions.
- Notes:
  Update docs, never code, for this item.

## Testing / E2E Debt

### TD-021 - Untested edges and UI coverage gaps

- Area: Testing
- Priority: P3
- Status: Deferred
- Introduced by: incremental test strategy (API-first)
- Related PR/commit: history/audit/media specs through PR #68
- Evidence (verified by coverage audits, not assumptions):
  - Non-numeric revision version (400 via ParseIntPipe) untested.
  - Opinion HistoryPanel and audit filter interactions have no
    Playwright coverage (article flows covered).
  - Restore flow has no Playwright coverage (deliberate).
  - Dashboard has no unit tests by project convention (Playwright +
    API E2E instead).
- Current impact:
  Low; critical paths are covered at API + key UI flows in Playwright.
- Why deferred:
  Conscious scope cuts per PR; no failures observed from these gaps.
- Future action:
  Fill opportunistically when touching these areas; no standalone
  campaign justified now.
- Notes:
  The Playwright reviewer-restore test (PR #65) and audit catalog
  test (PR #68) are covered and green in CI.

## UX / Product Debt

Covered by TD-005 through TD-011 (audit) and TD-013 (media usage).
No other UX debt is recorded: anything else would need fresh evidence.

## Known Flaky / Non-blocking Issues

### TD-030 - Syndication unpublish tombstone timing flake

- Area: Syndication tests (CI only; production unaffected)
- Priority: P3 (non-blocking by policy: rerun, never touch spec)
- Status: Known flaky
- Introduced by: unknown (timing-sensitive webhook stub assertion)
- Related PR/commit: N/A
- Evidence (verified, identical signature each time):
  `test/syndication.e2e-spec.ts` →
  "treats unpublish as idempotent tombstone and retries failures to
  failed" → `expect(tombstones.length).toBe(1)`, received 0.
  Occurrences: CI runs `36923560539`, `36931975983`, `37037483537`
  (each green on failed-job rerun).
- Current impact:
  Occasional red CI on unrelated PRs; always resolved by rerunning
  the failed `api` job. No production impact (test-only race on the
  `/hook3` stub delivery timing).
- Why deferred (not fixed):
  Standing rule: rerun, do not touch the spec; the race is in test
  stub timing, not product code.
- Future action:
  Reinvestigate only if frequency rises or a rerun ever fails twice
  in a row; then a dedicated timing/retry analysis of the stub —
  never a blind spec tweak.
- Notes:
  Criterion to reopen: back-to-back failures or >1 occurrence per
  typical PR cycle.

## Resolved Debt

Do not reopen these as pending work.

- P2-1 restore relation validation — `422 restore_relation_invalid`,
  in-tx checks, multi-relation reporting, parity — PR #67 — Resolved.
- P2-2 audit filter catalog drift — full catalog + ES/EN labels +
  drift guard in CI — PR #68 — Resolved.
- D1 no-op PATCH skips revision/audit — snapshot comparison —
  PR #64 — Resolved.
- D4 reviewer restore hidden (API 403 unchanged) — PR #65 — Resolved.
- D5 archived restore preserves status — PR #66 — Resolved.

## Rules for Future Cleanup

1. Evidence first: no item becomes work without a code/test/CI
   reference. Hypotheses without evidence are not debt.
2. One decision, one PR: keep scopes separated (as with D1/D4/D5,
   P2-1/P2-2). Never bundle unrelated fixes.
3. Contract freeze before behavior change: add failing-scope tests
   first (PR1 pattern), then change behavior.
4. No speculative scale work: volume-gated items (TD-001, TD-012)
   need measurements, not estimates.
5. Docs follow code: refresh design docs in dedicated passes; ADRs
   record as-built decisions.
6. Flaky policy: rerun first; investigate only on repetition with
   identical signature; never blind-tweak timing-sensitive specs.
7. Approvals before code for: retention/orphans, semantic changes
   (status/versioning/audit meaning), new endpoints, RBAC changes.
