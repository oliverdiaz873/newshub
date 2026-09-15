# Revisions (version history)

Deep module. Concept only — no backend exists. `MISSING` API + DB. Overwrites today are in-place (`articles.repository.ts:275-313`, `opinions.repository.ts:222-253`).

## 1. What must be knowable

For every material change: what changed (field-level diff: slug/title/summary/content/coverAlt/cover/category/author/flags/status), who (`createdBy/updatedBy` → user), when (`createdAt/updatedAt` + revision timestamp), previous vs current version (snapshot or delta + restore source), version number/identifier, and future restore affordance.

## 2. Target model (proposal; `DB REQUIRED`)

- New `revisions` table (or per-entity `article_revisions`/`opinion_revisions` — `OPEN DECISION`; proposal: single polymorphic `revisions(entityType, entityId, version, actorId, createdAt, snapshot JSONB, diff JSONB, cause: edit|transition|restore)` with `(entityType, entityId, version)` uniqueness and immutable rows (no update/delete API).
- Snapshot: full translation set + relations + flags + status at save time (JSONB, reusing `content Json` shape). Diff: computed server-side for display; snapshot is restore source (diffs alone are lossy).
- Versioning: monotonic per entity (`1,2,3…`); `version` exposed on reads; `PATCH`/transition creates revision row in same transaction as content update (`API REQUIRED`).
- Retention: `OPEN DECISION` (proposal: keep all P1; cap with explicit policy only in P2+; never silent pruning).

## 3. Behavior

- Every `POST|PATCH|transition` on articles/opinions appends a revision (including no-op transitions? proposal: no — idempotent `null→200 unchanged` writes no revision; document explicitly).
- Restore: `POST /articles/:id/revisions/:version/restore` (and opinions) creates a *new* version copying the old snapshot (never rewrites history), gated like publish; restores of published items follow published-edit rules (see `editorial-workflow.md`).
- Compare: `GET .../revisions` (paginated list with actor/when/cause), `GET .../revisions/:v1...` compare (server diff or client diff of snapshots — `OPEN DECISION`).
- UI: History tab on edit page (version list + who/when/cause + View/Diff/Restore with confirm; Restore rebaselines dirty-guard). Never expose raw JSONB as primary UI.

## 4. Non-goals for P0

No auto-restore on conflict, no branching, no per-locale version forks (version covers whole entity incl. both locales). Concurrent-edit handling stays last-write-wins until P2 collaboration (`OPEN DECISION`).

## 5. DoD for future increment

Migration applied; create/update/transition covered by tests asserting revision rows; restore creates new version (history length +1, never mutates old rows); UI history tab with diff + confirm; audit log references revision ids.
