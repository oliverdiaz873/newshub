# ADR-016: Revision Restore Rejects Dangling Snapshot Relations (422)

Status: Proposed
Date-Proposed: 2026-10-01
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: `apps/api/src/modules/articles/articles.service.ts` (`restoreRevision`), `apps/api/src/modules/opinions/opinions.service.ts` (`restoreRevision`), `apps/api/test/history.e2e-spec.ts`, ADR-015 (archived restore)

## Context

Revision restore rebuilds content from a stored snapshot, including its
relations (`categoryId`, `authorId`, `coverMediaId`). Those relations can
disappear after the version was recorded: authors are `SetNull` on
delete, unlinked covers can be removed, and a replaced category can be
deleted once nothing references it (`Restrict`). The normal `update()`
flow revalidates relations (`404` on missing), but `restoreRevision` did
not — a dangling snapshot relation reached the DB foreign key and
surfaced as an opaque HTTP 500, even though the transaction itself
rolled back atomically.

## Decision

Before writing, restore validates every relation present in the
snapshot inside the same restore transaction. If any no longer exists,
restore is refused with:

```text
HTTP 422
code: restore_relation_invalid
```

reporting **all** missing relations (relation + id), not just the
first. A refused restore creates no Revision and no AuditEvent. The
PostgreSQL foreign key stays as backstop for a concurrent delete
racing the check. Dangling relations are never sanitized to null:
restore either applies the snapshot faithfully or refuses. `published`
keeps refusing with `invalid_transition` before this check runs, and the
check applies equivalently to Articles (category/author/cover) and
Opinions (author/cover).

## Alternatives Considered

1. **Leave the 500:** rejected — legitimate flows (author/media
   cleanup followed by restore) deserve an explicit contract, and 500
   hides the cause from API consumers and future UI copy.
2. **Sanitize missing relations to null:** rejected — silently
   rewriting the restored content violates restore fidelity, and it is
   impossible where the relation is required (article category,
   opinion author).
3. **404 per missing entity:** rejected in favor of 422 — the restore
   target exists; what is unprocessable is the operation given the
   current state, matching the existing 422 taxonomy (semantic
   validation) over 404 (absent entity).

## Consequences

- Restore failures name their cause (`restore_relation_invalid` +
  human detail listing each dangling relation), enabling precise UI
  copy later without changing the contract.
- No behavior change for valid restores; no change to versioning,
  audit emission, status preservation, permissions, or D1/D4/D5.
- Residual race (delete between check and write) still surfaces as
  500 via the FK backstop; accepted as vanishingly rare and
  corruption-free by construction.

## Scope

Articles/Opinions `restoreRevision` relation guard only. No retention,
pagination, filter catalog, workflow, or permission changes.
