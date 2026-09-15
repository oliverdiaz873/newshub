# Audit Log (P1)

## 1. Status

Runtime audit log `MISSING`. Only minimal trace exists: `createdBy|updatedBy|createdAt|updatedAt` FKs on content + `refresh_tokens.revokedAt` (`schema.prisma`); transition comment `audit tracks the actor` (`articles.service.ts:242-244`) writes `updatedBy` only. The root-level `audit-baseline.json` files are snapshots, not a runtime log — must not be mistaken for auditability.

## 2. Target (concept; `API REQUIRED + DB REQUIRED`)

- Recorded actions: create, update, delete, publish, unpublish, schedule (set/cancel/execute/fail), archive, restore, revision restore, login, permission/role changes, media upload/delete (incl. blocked `media_in_use` attempts — `OPEN DECISION` on logging blocked attempts; proposal: yes, as security signal).
- Row proposal: `audit_events(id, at timestamptz, actorId NULL-system, action, entityType, entityId NULL, metadata JSONB incl. revision/version + before/after status, ipHash?)`. Append-only (no update/delete API; retention policy `OPEN DECISION`, proposal: immutable P1, explicit retention P2+ with legal review).
- Reads: `GET /audit-log` paginated + filters (actor/action/entity/date) + entity-scoped trail (`GET /articles/:id/audit`); guarded Admin (+ Editor scoped view — `OPEN DECISION`).
- Writes in same transaction as the mutated action where feasible; system-actor rows for scheduled executions.

## 3. UI obligations

`/audit-log` route: filterable table (actor/when/action/entity + detail drawer), entity History tabs link into it, export is P2 (`OPEN DECISION`). Every P1 feature (revisions, scheduling, planning, notifications) references audit ids.

## 4. DoD for future increment

Migration + emitter coverage on all listed actions with tests (including failed-login and blocked-delete rows if adopted); list + filters + entity trail; immutability test (update/delete rejected); performance note (indexes on `(at)`, `(entityType, entityId, at)`).
