# Editorial Workflow

Deep module. Normative workflow for articles and opinions. Backend matrix verified in `apps/api/src/common/transitions.ts` and enforced in `articles.service.ts:241-284`, `opinions.service.ts:204-248`.

## 1. States and flags

Content status (state machine) — one of:

- `draft` — editable working copy, not visible publicly.
- `review` — awaiting reviewer decision. Entered via `PATCH` (draft→review; only forward edit allowed today).
- `published` — publicly visible (`publishedAt` set once on first publish, never rewritten). Only `published` rows appear on public `GET /articles|/opinions`.
- `archived` — withdrawn from public, retained for record. Restorable.

Editorial flags (orthogonal, not states):

- `isFeatured`, `isBreaking` — articles only (`schema.prisma:94-95`). Never gate transitions; never render as status.

## 2. Transition matrix (locked, do not extend without ADR)

From `resolveTransition(current, action)`:

| Action | From → To | Idempotent no-op | Else |
|---|---|---|---|
| `publish` | `draft→published`, `review→published` | `published→200 unchanged` | 409 `invalid_transition` |
| `unpublish` | `published→draft` | `draft→200 unchanged` | 409 (e.g. from `review`/`archived`) |
| `archive` | `published→archived`, `draft→archived` | `archived→200 unchanged` | 409 (e.g. from `review`) |
| `restore` | `archived→draft` | — | 409 from any other state |

`PATCH` rule (current): only `draft` (no-op) / `review` from `draft`. Editing a `published` item via `PATCH` is rejected — the UI must route published edits through unpublish-first or a future revision flow, never silent overwrite expectations (see §4).

Endpoints: `POST /articles/:id/publish|unpublish|archive|restore` and identical `/opinions/:id/*`. Editorial reads: `GET /editorial/articles[/:id]`, `GET /editorial/opinions[/:id]` (any status, guarded).

## 3. Who can execute each transition (target; current in parentheses)

| Transition | Admin | Editor | Author/Writer | Reviewer |
|---|---|---|---|---|
| Create draft (`POST`) | yes | yes (current: yes) | yes, own items only (current: no such role; `OPEN DECISION` + `API REQUIRED` for ownership) | no |
| Submit draft→review (`PATCH`) | yes | yes | yes, own | no |
| Review→publish | yes | yes (current: yes) | no (proposes only) | yes (`API REQUIRED` to distinguish reviewer approval from editor publish if two-step approval required) |
| Publish from draft | yes | yes (current allows; target keeps but logs; `OPEN DECISION` whether to require review-first for P1+) | no | no |
| Unpublish published→draft | yes | yes | no (requests) | no (requests) |
| Archive | yes | yes | no | no |
| Restore archived→draft | yes | yes | own only (proposal) | no |
| Reject review→draft | yes | yes | — (receives) | yes |

Current backend: `@Roles('admin','editor')` on all writes + editorial reads; `admin==editor` (`roles.guard.ts:9-10`); no ownership, no viewer/contributor, no admin-only route in use. Target adds least-privilege without breaking current equivalence until ownership lands (see `permissions.md`).

## 4. Rejection, published edits, unpublish, rollback

- Rejection: `review→draft` via `unpublish` is not valid from `review` (matrix returns 409). Rejection today must be modeled as `PATCH` back to `draft` or a dedicated `reject` action — `OPEN DECISION` (`API REQUIRED` if new action). UI must not call `unpublish` on a `review` item. Rejection requires reason (P1, `DB REQUIRED` if persisted) and notification (see `notifications.md`).
- Editing published content: forbidden via `PATCH` today. Target options: (a) unpublish→edit→republish (loses `published` visibility window; `publishedAt` preserved as first-published), or (b) revision draft overlay (see `revisions.md`, P1). Migration (Increment 1-2) implements (a) with explicit confirm copy; (b) is roadmap P1.
- Scheduling: `publishedAt` is output-only (`now()` on transition). Future publish is `MISSING` — see `scheduling.md`. Never fake scheduling client-side.
- Rollback: no version store today. Rollback = restore from revision once revisions exist; until then, only `restore archived→draft`. Never claim undo beyond idempotent no-ops.
- Every action records actor via `updatedBy` today; immutable log is P1 (`audit-log.md`).

## 5. UI obligations

Transition buttons enabled only for valid `(current, action)` pairs (compute from matrix client-side to avoid doomed 409s, but always handle 409 with `Cannot {action} from '{current}'` humanized). Confirm destructive/visibility-changing actions (unpublish/archive/delete) via ported `#confirm-dlg`. Show `publishedAt` as First published (immutable) + `updatedAt` separately. Review queue surfaces `status=review` items with age and requester (requester needs `createdBy` exposure — `API REQUIRED` if not in list view today).
