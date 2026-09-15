# Planning (P1 — newsroom)

## 1. Status

Everywhere `MISSING` (no model/service/route; grep `assign` returns zero content hits). Mockup has no planning surface (only hardcoded review queue on Home). Dashboard has none. This doc defines the target so Increment planning has a spec.

## 2. Target capabilities

- Pitches/assignments: title, desk/category, assignee (author), reviewer, due date, priority, status (`pitched|assigned|in-progress|in-review|done|cancelled` — `OPEN DECISION` on vocabulary), linked article/opinion draft (created on accept).
- Editorial calendar: month/week/day views over due dates + scheduled publishes (reads `scheduledAt` once scheduling lands); drag-to-reschedule is P2.
- Workload: per-author open items, overdue highlighting, review queue (unifies `status=review` content + pending assignments).
- Permissions: Admin/Editor create/assign; Author sees own; Reviewer sees queue (see `permissions.md`).

## 3. Requirements

`DB REQUIRED` (new `assignments`/`pitches` tables or single `tasks` polymorphic — `OPEN DECISION`; proposal: single `planning_items` with `type` to avoid premature normalization) + `API REQUIRED` (CRUD, assign/unassign, state transitions, calendar query) + notifications on assign/due/overdue (see `notifications.md`). No planning backend in P0; Overview review-queue widget uses `status=review` content only until then.

## 4. UI obligations

`/planning` route (see `information-architecture.md`), calendar + board + list views sharing one query, empty states per view, dirty-guard on pitch forms, toasts/confirm per UI spec. Proposal only — revisit after scheduling + notifications increments.
