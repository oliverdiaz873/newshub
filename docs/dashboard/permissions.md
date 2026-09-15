# Permissions (RBAC)

Deep module. Target role model vs verified current implementation.

## 1. Current RBAC (verified, `EXISTS` core / `PARTIAL` model)

- Guards: `JwtAuthGuard` (strict `Bearer`, 401) + `RolesGuard` (`ROLES_KEY`, 403 `Insufficient role`) on all writes, `GET /editorial/*`, `GET /media`, `GET /authors*` (`editorial.controller.ts:17-19`, `authors.controller.ts`, `media.controller.ts`). Public reads open (published-only by design).
- Roles in use: `@Roles('admin','editor')`; `roles.guard.ts:9-10` documents `admin==editor` in MVP; no `viewer|contributor`, no admin-only route in use, no ownership check (any editor edits/deletes any content).
- Tokens: access JWT 15 min (`JWT_ACCESS_TTL_MIN`), opaque 48B hex refresh (sha256 stored, 7 d `REFRESH_TTL_DAYS`, rotation + reuse-detection `revokeFamily`, HttpOnly `path /api/v1/auth SameSite=lax Secure-in-prod`), argon2 passwords, throttling (global `1000/min`, login `10/min`, refresh `20/min`).
- Dashboard: `AuthProvider` exposes `user/role` but no page gates on it; unauth renders `Sesión requerida` after 401; no `middleware.ts`, no `(auth)` group.

## 2. Target role model (conceptual; do not implement in this phase)

| Capability | Admin | Editor | Author/Writer | Reviewer |
|---|---|---|---|---|
| Manage users/roles | yes | no | no | no |
| Categories/authors CRUD | yes | yes | no (suggest) | no |
| Articles/opinions create (own) | yes | yes | yes (own only) | no |
| Edit own draft/review | yes | yes | yes | no |
| Edit others' content | yes | yes | no | no (comment/suggest P2) |
| Submit draft→review | yes | yes | yes (own) | no |
| Approve/publish | yes | yes | no | yes (review→publish path; two-step approval is `OPEN DECISION`) |
| Unpublish/archive/restore | yes | yes | no | no |
| Media upload/delete | yes | yes | upload yes / delete own-or-unused (`OPEN DECISION`) | no |
| View analytics/audit | yes | yes (audit scope `OPEN DECISION`) | own stats only | queue only |
| Settings (workspace) | yes | no (personal prefs yes) | personal prefs | personal prefs |

Ownership (`createdById` exists on Article/Opinion/Category/Media) enables own-vs-any scoping — `API REQUIRED` (service-level checks) + UI gating. Reviewer is a new role — `API REQUIRED + DB REQUIRED` only if `User.role` values need migration/seed; `User.role` is a free string today so values can extend without schema change, but semantics need guard updates.

## 3. Dashboard gating (target)

- Server: `middleware.ts` redirect anonymous → `/login?next=`; `(auth)` group for staff routes; role-aware nav (hide Planning/Analytics/Audit per role; never rely on hiding alone — server enforces).
- Client: gate on `user/role/ready` from `useAuth` (exists but unused today); 401 → silent `tryRefresh` once → login redirect with `next`; 403 → dedicated insufficient-role page (not generic error).
- Audit: role changes themselves are audit-logged (P1).

## 4. Migration path (no new RBAC in this phase)

Increment 0: add middleware + UI gating on existing `admin|editor` equivalence (no semantic change). Later increment: introduce Author/Reviewer + ownership checks behind `OPEN DECISION` on two-step approval and media-delete scope. Never invent `viewer|contributor` handling until specified. `OPEN DECISION`: whether publish requires prior review (proposal: optional in P0, enforced in P1 review flow).
