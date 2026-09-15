# Scheduling

> Status: IMPLEMENTED (Increment 5). Concept sections below are kept as the
> design record; implementation notes are marked `[Inc 5]`.
>
> Amendments adopted at review (locked): scheduling is **review-only**
> (`POST /:id/schedule` from non-review → 409 `invalid_transition`, so
> automation never skips the editorial gate); failures keep `scheduledAt`
> (retry each tick, log + `schedule.failed` hook, visible as **overdue**)
> with **no error columns and no fifth status**; audit/notification
> persistence deferred to Inc 6/7.

Deep module. Concept only — fully `MISSING` in API + DB. Verified: grep `schedul|cron|queue|bull` in `apps/api/src` returns only a `publishing workflow` comment; `publishedAt` is output-only set to `now()` on transition; DTOs (`content-write.dto.ts`) carry no schedule field.

## 1. Definitions

- Scheduled state (view): an item with a future `scheduledAt` awaiting auto-publish. Displayed under Articles → Scheduled (filtered view, not a status value until backend defines it — `OPEN DECISION` whether `scheduled` becomes a fifth status or stays `approved/draft + scheduledAt`; proposal: keep `status` matrix locked and add `scheduledAt` nullable + derived Scheduled view, avoiding matrix churn).
- `scheduledAt`: nullable timestamptz, author-chosen future instant with explicit timezone capture (store UTC; display in editor locale + UTC tooltip).
- Executor: server-side publisher that flips due items to `published` (cron vs queue — `OPEN DECISION`; proposal: DB + lightweight scheduler in NestJS first, Bull/queue only when volume/retries demand it).

## 2. Functional behavior (target)

- Editor sets/clears `scheduledAt` on draft/review/approved items (approved only exists if two-step review lands; otherwise draft/review). Setting requires `scheduledAt > now()`; past values rejected 422. Clearing returns item to plain draft/review.
- At due time: system publishes (actor = system; revision cause `scheduled-publish`; audit event `schedule.publish`; `publishedAt` set once as with manual publish; Spanish-required enforced at execution — failures surface in queue + notifications, item stays unscheduled-visible with error).
- Unpublish/archive before due cancels schedule (clear `scheduledAt` in same transaction; audit `schedule.cancel`).
- Editing a scheduled item keeps schedule unless content invalidation rules say otherwise (`OPEN DECISION`; proposal: edits keep schedule, transitions部 manual publish clears it).
- Timezone: input captures IANA zone; API stores UTC; UI shows local + relative (`in 3h`) + UTC title. DST-safe by construction.
- Permissions: schedule/cancel gated like publish (Admin/Editor; Author proposes — `OPEN DECISION`).

## 3. Proposed persistence (`DB REQUIRED`)

Add to `Article`/`Opinion` (or shared scheduling table if planning converges — `OPEN DECISION`): `scheduledAt timestamptz NULL`, `scheduledById UUID NULL → users`, index on `(status, scheduledAt) WHERE scheduledAt IS NOT NULL`. No cron columns on row; executor polls due rows (`FOR UPDATE SKIP LOCKED` when concurrent) or queue jobs reference row ids.

## 4. Proposed API (`API REQUIRED`)

- `POST /articles/:id/schedule { scheduledAt }` (422 past/invalid, 409 `invalid_transition` when state forbids), `DELETE /articles/:id/schedule` (idempotent clear), same for opinions. Include `scheduledAt/scheduledBy` in editorial reads; public reads never expose future items.
- List filter `?scheduled=true|false|overdue` on editorial endpoints; Scheduled view uses it.
- Executor endpoint internal only (no public route); failures emit audit + notification events.

## 5. UI obligations

Schedule picker (date+time+zone, default zone = editor locale), clear action with confirm, Scheduled list with countdown + overdue highlighting + retry/cancel, conflict copy when manual publish would preempt schedule. Never fake scheduling with client timers.

## 6. DoD for future increment

Migration + indexes; schedule/cancel endpoints with tests (past-date 422, due-execution publish, cancel-on-unpublish); Scheduled view with countdown; timezone round-trip test; audit + revision entries for schedule lifecycle.

## 7. Implementation record (Increment 5)

- Migration `20260913000000_scheduling`: `scheduled_at/by` + partial indexes, both entities. Matrix untouched.
- Endpoints as §4 + review-only 409 + `DELETE` idempotent; `scheduledAt` in list items and editorial reads.
- Executor: `@nestjs/schedule` cron/minute, atomic guarded claims (`updateMany` review+instant match), ES defensive check, actor = scheduler human (`scheduledById` → `updatedBy`), retry-by-design, structured logs as `schedule.failed` hook.
- Dashboard: `/scheduled` (both kinds, countdown, overdue, cancel, publish-now with preemption copy), editor `ScheduleSection` (review only, local→UTC, confirm on clear), list badges, EN/ES.
- H1 bundled in the same increment: media filter counts, i18n hardcoded cluster, 360px CSS, this docs refresh.
