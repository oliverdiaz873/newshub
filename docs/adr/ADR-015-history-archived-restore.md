# ADR-015: Revision Restore on Archived Content Preserves Status

Status: Proposed
Date-Proposed: 2026-10-01
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: `apps/api/src/modules/articles/articles.service.ts` (`restoreRevision`), `apps/api/src/modules/opinions/opinions.service.ts` (`restoreRevision`), `apps/api/test/history.e2e-spec.ts`, ADR-014 (no-op PATCH versioning)

## Context

Revision restore rebuilds content from a stored snapshot. The snapshot
contains a `status` field (the status at version time), so the restore
flow must decide whether the live status is replaced by the historical
one. Articles and Opinions share the same `restoreRevision` shape: only
`published` items refuse restore (`invalid_transition`, unpublish-first);
`draft`, `review`, and `archived` items accept it.

## Decision

Restoring a historical revision onto `archived` content is allowed, and
the restored content keeps the live status `archived`:

```text
archived
        →
restore revision
        →
new revision created, content restored, status remains archived,
AuditEvent recorded
```

Concretely, the restore:

- creates a new revision (history is appended, never rewritten; the
  original revision stays intact);
- restores content and versioned relations/flags from the snapshot;
- conserves the live status — the snapshot's stored status is never
  applied;
- records the `revision.restore` audit event with `restoredVersion`.

Status is therefore not part of the restorable workflow state: restore
changes *what* the content says, never *where* it sits in the editorial
flow. Moving out of `archived` stays the job of the `restore`
(draft) transition, not of revision restore.

## Published Protection (Unchanged)

`published → restore` keeps refusing with `invalid_transition`
(unpublish-first), double-checked outside and inside the restore
transaction. This ADR does not alter published, draft, or review
behavior, nor transitions, scheduling, permissions, or D1/D4.

## Alternatives Considered

1. **Block restore on archived (unarchive-first):** rejected — it would
   force a status round-trip for a content-only operation and contradict
   the invariant that restore never touches status.
2. **Restore and move to draft:** rejected — silently rewriting status
   surprises editors and breaks the status-preservation invariant.
3. **Apply the snapshot's stored status:** rejected — a historical status
   (e.g. `draft` from v1) must never override the live workflow state.

## Consequences

- Editors can recover content of archived items without unarchiving
  them first.
- `archived` remains a stable dormant state across restores.
- Contract locked by E2E tests for Articles and Opinions (parity):
  restore succeeds, content matches the revision, status stays
  `archived`, new version appended, original untouched, audit recorded.

## Scope

History / revision restore on archived content and status
preservation only. No D1, D4, retention, pagination, Audit Log, or
workflow changes.
