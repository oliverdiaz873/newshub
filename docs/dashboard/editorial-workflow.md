# Editorial Workflow

Deep module. Normative workflow for articles and opinions. Backend matrix verified in `apps/api/src/common/transitions.ts`.

## 1. States and flags

Content status (state machine) — one of:

- `draft` — editable working copy, not visible publicly.
- `review` — awaiting reviewer decision. Entered via `PATCH` (draft→review; only forward edit allowed today).
- `published` — publicly visible (`publishedAt` set once on first publish, never rewritten). Only `published` rows appear on public `GET /articles|/opinions`.
- `archived` — withdrawn from public, retained for record. Restorable.

Editorial flags (orthogonal, not states):

- `isFeatured`, `isBreaking` — articles only (`Article` model in `schema.prisma`). Never gate transitions; never render as status.

## 2. Transition matrix (locked, do not extend without ADR)

From `resolveTransition(current, action)`:

| Action | From → To | Idempotent no-op | Else |
|---|---|---|---|
| `publish` | `review→published` (publish is review-only) | `published→200 unchanged` | 409 `invalid_transition` |
| `unpublish` | `published→draft` | `draft→200 unchanged` | 409 (e.g. from `review`/`archived`) |
| `archive` | `published→archived`, `draft→archived` | `archived→200 unchanged` | 409 (e.g. from `review`) |
| `restore` | `archived→draft` | — | 409 from any other state |
| `reject` | `review→draft` (dedicated `POST :id/reject`, optional reason ≤500) | `draft→200 unchanged` | 409 from any other state |

`PATCH` rule (current): only `draft` (no-op) / `review` from `draft`. Editing a `published` item via `PATCH` is rejected — the UI must route published edits through unpublish-first or a future revision flow, never silent overwrite expectations (see §4).

Endpoints: `POST /articles/:id/publish|unpublish|archive|restore|reject` and identical `/opinions/:id/*`. Editorial reads: `GET /editorial/articles[/:id]`, `GET /editorial/opinions[/:id]` (any status, guarded).

## 3. Who can execute each transition (target; current in parentheses)

| Transition | Admin | Editor | Author/Writer | Reviewer |
|---|---|---|---|---|
| Create draft (`POST`) | yes | yes (current: yes) | yes, own items only (current: no such role; `OPEN DECISION` + `API REQUIRED` for ownership) | no |
| Submit draft→review (`PATCH`) | yes | yes | yes, own | no |
| Review→publish | yes | yes | no (proposes only) | yes (two-step approval enforced: publish is review-only) |
| Publish from draft | — (rejected, 409) | — (rejected, 409) | no | no |
| Unpublish published→draft | yes | yes | no (requests) | yes |
| Archive | yes | yes | no | yes |
| Restore archived→draft | yes | yes | own only (proposal) | yes |
| Reject review→draft | yes | yes | — (receives) | yes |

Current backend: `@Roles('admin','editor')` on creation/deletion/scheduling/restore, plus `reviewer` on reads, transitions (incl. `reject`), and history reads; no ownership, no viewer/contributor, admin-only webhook routes. Target adds least-privilege without breaking current equivalence until ownership lands (see `permissions.md`).

## 4. Rejection, published edits, unpublish, rollback

- Rejection: dedicated `POST :id/reject` (`review→draft`), optional reason (≤500 chars, persisted in audit metadata + notification). UI must not call `unpublish` on a `review` item (matrix returns 409).
- Editing published content: forbidden via `PATCH` today. Target options: (a) unpublish→edit→republish (loses `published` visibility window; `publishedAt` preserved as first-published), or (b) revision draft overlay (see `revisions.md`, implemented as restore-as-new-version for snapshots).
- Scheduling: `scheduledAt` review-only scheduling with executor (`scheduling.md` implemented); `publishedAt` output-only on transition. Never fake scheduling client-side.
- Rollback: version store exists (`revisions`); rollback = restore from revision as a new version (blocked while published). Never claim undo beyond idempotent no-ops.
- Every action records actor via `updatedBy` plus immutable audit rows (see `audit-log.md`).

## 5. UI obligations

Transition buttons enabled only for valid `(current, action)` pairs (compute from matrix client-side to avoid doomed 409s, but always handle 409 with `Cannot {action} from '{current}'` humanized). Confirm destructive/visibility-changing actions (unpublish/archive/delete) via ported `#confirm-dlg`. Show `publishedAt` as First published (immutable) + `updatedAt` separately. Review queue surfaces `status=review` items with age and requester (requester needs `createdBy` exposure — `API REQUIRED` if not in list view today).
