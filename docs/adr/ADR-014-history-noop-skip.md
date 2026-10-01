# ADR-014: History Skips No-Op PATCH (No Revision/Audit Without Effective Change)

Status: Proposed
Date-Proposed: 2026-10-01
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: `apps/api/src/modules/articles/articles.service.ts`, `apps/api/src/modules/opinions/opinions.service.ts`, `apps/api/src/modules/history/snapshot-equal.ts`, `apps/api/test/history.e2e-spec.ts`

## Context

Every `PATCH /api/v1/articles/:id` and `PATCH /api/v1/opinions/:id` recorded
a new `Revision` plus an `AuditEvent` (`cause: 'edit'` / `action: 'update'`),
even when the request changed nothing effective: re-saving identical
content, or re-submitting an already-satisfied status, appended a version.
The Save button in the editors is not gated on dirty state, so ordinary
re-saves produced spurious versions. A version should represent an
effective change of editorial state, not a redundant write; noise also
propagates to the Audit Log, version numbers, and traceability.

## Decision

A `PATCH` with no effective change on the resource:

```text
PATCH sin cambio efectivo
        →
HTTP 200
        →
NO nueva Revision
NO nuevo AuditEvent
```

A `PATCH` with at least one effective change keeps the previous behavior:

```text
PATCH con cambio efectivo
        →
HTTP 200
        →
Revision + AuditEvent (atomic with the update, as before)
```

Detection is server-side and compares the **complete effective snapshot**
before and after the mutation — conceptually
`snapshotBefore === snapshotAfter` — using the same snapshot builders
already used for History (`snapshotArticle` / `snapshotOpinion`), never
the raw client DTO. The snapshot covers content, translations, status,
relations, flags, and consistently represented dates. Translations are
canonicalized by sorting on locale before comparison so unspecified DB
row order cannot fabricate a difference. When equivalent, the flow
succeeds without calling `recordHistory()`; otherwise `recordHistory()`
runs inside the same transaction as the update.

The rule applies equivalently to `ArticlesService.update()` and
`OpinionsService.update()` (parity). The `review → review` PATCH resolves
through the same `update()` path (`resolvePatchStatus` returns no target
status), so it is covered by the same snapshot comparison with no special
branch.

## Alternatives Considered

1. **Keep versioning every PATCH (previous behavior):** rejected — every
   re-save appends history and audit noise; version numbers stop meaning
   "effective change".
2. **Compare only the received DTO:** rejected — partial comparison cannot
   see normalization, defaults, or status resolution; the snapshot is the
   already-established representation of effective state.
3. **Client-only gate (disable Save when clean):** rejected as the sole
   mechanism — dirty state is UI-local and does not cover direct API
   callers; server-side comparison protects all writers uniformly.
4. **Create-then-delete the revision:** rejected — the skip happens before
   `recordHistory()` is ever called; no empty rows are written.

## Consequences

- Repeatedly saving identical state no longer grows `revisions`,
  `audit_events`, or version numbers.
- `PATCH` responses, editorial states, and endpoint behavior are
  unchanged: only history/audit emission is conditional.
- `resolvePatchStatus` idempotent paths need no separate handling.
- Trade-off: an intentional "checkpoint save" with zero content change
  no longer leaves a trace (accepted: checkpoints without changes carry
  no editorial information).

## Scope

Articles and Opinions `update()` flows only. Transitions, restores,
scheduling, bulk, deletes, reviewer permissions, retention, HistoryPanel
pagination, and Audit Log filters are untouched by this decision.
