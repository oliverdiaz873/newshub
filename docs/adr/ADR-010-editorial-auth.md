# ADR-010: Editorial Authentication & Authorization

Status: Accepted
Date-Proposed: 2026-09-06
Date-Accepted: 2026-09-06
Owner/Deciders: Oliver (Arch) + agent (draft)
Refs: Data Model v2 (users without credentials), API Contract v1.1 (401/403),
  FEATURE-002

## Context
F2 needs editorial login + RBAC for categories/authors CRUD. The locked v2
`users(id, email, display_name, role)` intentionally carries NO credentials.
This ADR decides the mechanism AND where secrets live.

## Decision: Option A + A2 (own JWT, isolated credentials)
- Own JWT: short-lived access token + opaque random refresh token.
- Refresh token stored HASHED in DB (`refresh_tokens`), sent via HttpOnly
  cookie. Secure in production (local HTTP dev works without it); SameSite
  appropriate (Lax default).
- Rotation: each refresh invalidates the previous token.
- Reuse detection: reuse of a revoked token invalidates the token family.
- Logout revokes the refresh token.
- Password hashing: Argon2id first option, unless practical stack
  incompatibility (fallback: bcrypt).
- Credentials isolated: `user_credentials(user_id PK/FK, password_hash,
  updated_at)`; `users` stays identity-only as locked.
- RBAC via guards + `role` enum (`admin | editor`, same content permissions
  in MVP).
- Rate limiting on login/refresh.

## Consequences
- Full control and revocation; clear portfolio showcase of auth design
  inside NestJS.
- Must implement rotation, reuse detection, rate limits; one auth migration.
  More security responsibility than delegating.

## Alternatives Considered
- Option B external Identity Provider: rejected for now — external
  dependency plus integration decisions (provisioning, roles mapping, local
  dev story), oversized for current team/scale.
- A1 `password_hash` inline on `users`: rejected — mixes identity + secrets;
  separate table allows future provider rows.

## Open (explicitly deferred)
Exact TTLs, lockout policy, sessions UI, password recovery, MFA, OAuth.
No sessions UI, recovery, MFA or OAuth in F2.

## Notes
Secure is conditional on production; TTLs/lockout stay open decisions.
