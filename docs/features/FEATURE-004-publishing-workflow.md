# FEATURE-004: Publishing Workflow (F4)

Status: Implemented (F4, branch `feature/f4-publishing`)

## Description
Publishing lifecycle for articles and opinions: publish/unpublish/archive/
restore/reject actions plus `draft → review` via PATCH (documented exception),
`firstPublishedAt` set once and immutable, public surface unchanged
(published-only), dashboard action buttons + status filter.
Post-F4 evolution (kept here so this doc stays accurate): publish is
review-only (two-step approval), `reject` is a dedicated action, and
`reviewer` executes transitions — see matrix and RBAC below.

## Requirements
- Functional:
  - `POST /:id/publish|unpublish|archive|restore|reject` on articles and opinions
    with auth + RBAC (`admin|editor` on creation/deletion; `reviewer` additionally
    on transitions, history reads, and editorial reads).
  - Locked transition matrix (see below); illegal transitions → 409
    `invalid_transition`; idempotent 200 when already in target state.
  - `firstPublishedAt` set on first publish only; unpublish keeps history
    (`published → draft`); archive from `published|draft`; restore to `draft`;
    `reject` sends `review → draft` with optional reason (≤500 chars).
  - PATCH `status: review` allowed only from `draft` (idempotent on `review`);
    any other PATCH status → 422, drift to `draft` from elsewhere → 409.
  - `updatedBy` reflects the authenticated actor on every transition.
  - Dashboard lists with status filter + contextual action buttons.
- Non-functional: public GETs still published-only; secrets never logged.
- Out of scope: scheduling, public preview, notifications, bulk actions,
  model changes/migrations, co-authorship, comments.

## Transition Matrix (locked)

| From | Action | To |
|---|---|---|
| `review` | publish | `published` |
| `published` | unpublish | `draft` |
| `published`, `draft` | archive | `archived` |
| `archived` | restore | `draft` |
| `review` | reject | `draft` |
| already in target | same action | 200 unchanged |
| anything else | any | 409 `invalid_transition` |

## Acceptance Criteria
- [x] Publish review → `published` with `firstPublishedAt` set; visible publicly (publish is review-only; draft → 409).
- [x] Re-publish keeps original `firstPublishedAt`; unpublish → `draft` + 404 public.
- [x] Archive/restore cycle; publish archived → 409; restore non-archived → 409.
- [x] Reject review → `draft` with optional reason; reviewer executes transitions.
- [x] PATCH `review` from draft → 200; from published → 409; PATCH `published` → 422.
- [x] Anonymous transition → 401; audit `updatedBy` asserted in e2e.
- [x] Dashboard filter + buttons work via API.
- [x] Unit (matrix, 16 cases) + e2e (lifecycle both entities) green.

## Design
- Pure `resolveTransition()` helper (unit-tested matrix) + thin service
  wrappers; `setStatus` repository methods; no migration (columns exist).
- Publish additionally requires ES translation (defensive; F3 invariant).
- `DtoPipe` explicit validation everywhere (esbuild metadata gap, F2 fix).

## Implementation Plan
1. Matrix helper + repository `setStatus`.
2. Service transitions + PATCH policy + controller endpoints.
3. Tests (unit matrix + publishing e2e).
4. Dashboard buttons + status filters.
5. Gates + PR.

## Testing Strategy
- Unit: full matrix (6 legal, 3 idempotent, 7 illegal → 409 `invalid_transition`).
- Integration: per-entity lifecycle, visibility flip on public surface,
  immutability, audit, auth matrix.

## Dependencies
ADR-009/ADR-010, Data Model v2, API Contract v1.1, F1–F3.

## Risks and Mitigations
- Unpublish breaks public URLs → accepted documented behavior (404).
- Double submit → idempotent actions.
- `firstPublishedAt` semantics → explicit in docs + API shape (field name kept
  per locked contract; means first publication).

## Notes
Scheduling shipped separately (Increment 5); no model change was needed for F4.
