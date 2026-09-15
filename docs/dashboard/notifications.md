# Notifications (P1)

## 1. Status

`MISSING` everywhere (grep `notificat` returns zero). Mockup toasts are ephemeral UI confirmations, not a notification system. Dashboard has none. No mail/push/template infrastructure.

## 2. Target (concept; `API REQUIRED + DB REQUIRED`)

- Events: review requested, approved/rejected (with reason), published/unpublished/archived, scheduled due/failed, assigned/due-soon/overdue (once planning exists), role changes, `media_in_use` unblock notices (P2).
- Delivery: in-app inbox (`/notifications`) + unread badge (sidebar/topbar) first; email/push are `OPEN DECISION` P2+ (need provider, templates EN/ES, preferences, unsubscribe).
- Model proposal: `notifications(id, userId, type, entityType, entityId, actorId, createdAt, readAt NULL, payload JSONB)` + preferences (per-type opt-out, digest vs instant — `OPEN DECISION`). Immutable rows except `readAt`; paginated list + mark-read + mark-all-read.
- Permissions: users see own only; Admin sees system failures queue.

## 3. Non-goals for P0/P1-first

No real-time sockets (poll on nav + Overview refresh suffices until proven otherwise — `OPEN DECISION`), no marketing newsletters (distribution P2), no storefront subscriber notifications.

## 4. DoD for future increment

Event emitters on transitions + planning actions with tests; inbox with unread state; preferences persisted; failure surfacing for scheduled publishes.
