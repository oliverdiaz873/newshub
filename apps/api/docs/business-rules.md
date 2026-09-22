# Reglas de negocio reales de Newshub — Auditoría y documentación

## 1. Objetivo

Este documento es el inventario verificable de las reglas de negocio que **realmente existen hoy** en Newshub. No propone el rediseño de la base de datos ni agrega reglas artificiales para "cumplir" un apunte. Su finalidad es servir como entrada para el futuro rediseño de la arquitectura de datos: primero saber qué reglas existen y cómo están garantizadas, después decidir cómo modelar la nueva base de datos.

Alcance: backend/API (`apps/api`: NestJS + PostgreSQL + Prisma, REST `/api/v1`). El frontend (`storefront`, `dashboard`) no se considera autoridad de ninguna regla. La base de datos PostgreSQL es la fuente de persistencia; el backend es la fuente de verdad de las reglas de aplicación.

## 2. Criterio de auditoría

Metodología de referencia: apunte "Reglas de negocio" (integridad, unicidad, obligatoriedad, integridad referencial, estados/transiciones, temporales, autorización, límites, multi-entidad, invariantes, concurrencia, historial/auditoría, distribución BD/API/frontend, evolución). Los ejemplos de ecommerce del apunte son pedagógicos; cuando no corresponden al dominio editorial se clasifican como `N/A`.

Regla de evidencia:

- Una regla solo se documenta como `BR-XXX` si hay evidencia suficiente en `schema.prisma`, migraciones SQL, repositories, services, controllers, DTOs, guards o configuración relevante.
- El código y la base de datos son evidencia primaria. Cuando la documentación contradice al código, se documenta la discrepancia (caso real: `docs/architecture.md`, `docs/folder-structure.md` y `docs/getting-started.md` describen un monolito Next.js sin backend/DB; el código real es un monorepo con `apps/api` NestJS + Postgres + Prisma; la documentación vigente real está en `docs/adr/ADR-012-*`, `docs/features/*`, `docs/dashboard/*`, `docs/storefront/*`).
- No se convierte cada validación trivial de DTO (formato de email, longitud mínima) en regla de negocio. `email con formato válido` es validación; `email no duplicable` sí es regla.
- Numeración `BR-001…BR-022` estable. Las candidatas iniciales se confirmaron contra evidencia: se agrupó `BR-003` en variantes, se reclasificó `BR-009` como restricción de dominio de soporte, se eliminó la candidata `BR-023` (timestamps) como regla independiente por no existir una regla que exija esos campos por sí mismos (ver §7), y se verificó la semántica exacta de notificaciones (BR-019) y webhooks (BR-020) antes de afirmarlas.
- Estados posibles por regla: `Cumple` (existe y hay garantía adecuada con evidencia), `Parcial` (existe pero la garantía es incompleta), `Riesgo` (diseño intencional con pérdida aceptada o carrera documentada), `N/A` (dominio no implementado), `Necesita investigación` (evidencia insuficiente, no se afirma inexistencia).

### Nota de vigencia (serie física 2026-09-22)

- Las citas `schema.prisma:NN` corresponden al schema vigente tras M-02 (modelo `Locale` + relaciones `localeRef`).
- `locale` ya no se rige por `*_locale_check`: es FK a `locales(code)` con `RESTRICT/UPDATE CASCADE` (migración `20260920000000_locales`). Agregar un idioma es un `INSERT`, no un cambio estructural.
- `entity_type` polimórfico y `mime` de medios ahora tienen CHECKs cerrados (migración `20260920000001_catalog-checks`).
- Existe la vista de solo lectura `media_orphans` (migración `20260920000002_media-orphans`).

## 3. Entidades relevantes

Definidas en `apps/api/prisma/schema.prisma` (Data Model v2). Convenciones: PKs UUID (`@default(uuid())`), tablas/columnas `snake_case`, traducciones en tablas separadas `@@id([id,locale])`, contenido editorial como `Json` (JSONB).

| Entidad | Tabla | Rol en reglas |
|---|---|---|
| User | `users` | Unicidad email, roles, FK de auditoría/autoría |
| UserCredential | `user_credentials` | Secreto 1:1 por usuario |
| RefreshToken | `refresh_tokens` | Sesión, unicidad hash, revocación |
| Author / AuthorTranslation | `authors` / `author_translations` | Slug único, nombre único por locale |
| Category / CategoryTranslation | `categories` / `category_translations` | Slug único por locale, FK obligatoria de artículos |
| Article / ArticleTranslation | `articles` / `article_translations` | Workflow editorial, scheduling, slug único por locale |
| Opinion / OpinionTranslation | `opinions` / `opinion_translations` | Workflow editorial, autor obligatorio, slug único por locale |
| MediaAsset | `media_assets` | `storage_key` único, portadas opcionales |
| Revision | `revisions` | Historial append-only versionado |
| AuditEvent | `audit_events` | Auditoría inmutable |
| Notification / NotificationPref | `notifications` / `notification_prefs` | Inbox, solo `readAt` mutable, prefs 1:1 |
| PlanningItem | `planning_items` | Workflow planificación, vencimientos |
| Webhook / WebhookDelivery | `webhooks` / `webhook_deliveries` | Syndication, entrega idempotente |

Constraints estructurales (origen: `apps/api/prisma/migrations/20260906201307_init/migration.sql`, `20260906224552_auth`, `20260913000000_scheduling`, `20260914000000_history`, `20260915000000_notifications`, `20260916000000_reviewer-role`, `20260917000000_planning`, `20260919000000_webhooks`):

- PK: todas las tablas principales (`users_pkey`, `authors_pkey`, `articles_pkey`, etc.).
- UNIQUE: `users_email_key`, `authors_slug_key`, `author_translations_locale_name_key`, `category_translations_locale_slug_key`, `article_translations_locale_slug_key`, `opinion_translations_locale_slug_key`, `media_assets_storage_key_key`, `refresh_tokens_token_hash_key`, `revisions_entity_version_key`, `webhook_deliveries_subscription_entity_action_key`.
- NOT NULL: `articles.category_id`, `opinions.author_id`, claves de traducción, `notifications.user_id`, etc.
- FK: traducciones `CASCADE`; `articles.category_id → categories RESTRICT`; `opinions.author_id → authors RESTRICT`; autoría/auditoría `SET NULL`; credenciales/tokens/notificaciones `CASCADE`; `webhook_deliveries.subscription_id → webhooks CASCADE`.
- CHECK: `users_role_check`, `*_slug_check` (regex `^[a-z0-9-]{3,120}$`), `articles_status_check` / `opinions_status_check`, `articles_published_at_check` / `opinions_published_at_check`, `*_content_check` (JSONB array no vacío), `planning_items_{type,priority,status}_check`, `webhook_deliveries_{status,action}_check`, más `revisions/audit_events/notifications/planning_items/entity_type` y `media_assets/mime` (M-03). Los antiguos `*_locale_check` fueron reemplazados por FKs a la tabla `locales` (M-02, ver nota de vigencia en §2).
- Índices parciales: publicados (`articles_status_published_at_idx`, `articles_category_published_idx`, `opinions_status_published_at_idx`, curaduría breaking/featured), programados (`articles_scheduled_idx`, `opinions_scheduled_idx`), entitlements de lectura (`notifications_user_created_idx`, `audit_events_*`, `revisions_entity_version_idx`).

## 4. Matriz BR-XXX

| ID | Regla | Tipo | Entidades | Garantía principal | BD | API | Concurrencia | Estado | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| BR-001 | Email de usuario único | Unicidad | User | BD + API | `UNIQUE users.email` | Búsqueda por email normalizado; sin registro público (usuarios por seed) | UNIQUE como garantía final ante carreras | Cumple | `schema.prisma:16`, `init/migration.sql:127`, `auth.repository.ts:findUserWithCredentialsByEmail` |
| BR-002 | Slug de autor único y con formato | Unicidad, Integridad | Author | BD + API | `UNIQUE authors.slug` + `authors_slug_check` | Conflicto `P2002 → 409 slug_taken` en escritura editorial | UNIQUE | Cumple | `schema.prisma:63`, `init/migration.sql:130,209` |
| BR-003 | Identificador visible único por locale (variantes 003a–003d) | Unicidad | Category/Article/Opinion/Author translations | BD + API | `UNIQUE ([locale,slug])` x3 + `UNIQUE ([locale,name])` x1 + CHECKs de formato slug + FK `locale → locales` (M-02) | `P2002 → 409 slug_taken` | UNIQUE | Cumple | Ver §5 BR-003 |
| BR-004 | `storage_key` de medio único | Unicidad | MediaAsset | BD | `UNIQUE media_assets.storage_key` | Registro vía servicio de medios | UNIQUE | Cumple | `schema.prisma:200`, `init/migration.sql:151` |
| BR-005 | Sesión: token único, rotación con detección de reuso y expiración | Unicidad, Temporal, Autorización | RefreshToken, User | BD + API | `UNIQUE token_hash` + FK `CASCADE` | Rotación (revoca anterior al refrescar), quema de familia ante reuso, expiración, logout revoca | UNIQUE + `updateMany` condicional | Cumple | `auth` migration, `auth.service.ts:refresh/logout/issue`, `schema.prisma:225` |
| BR-006 | Un artículo pertenece obligatoriamente a una categoría válida | Obligatoriedad, Integridad referencial | Article → Category | BD | `category_id NOT NULL` + FK `RESTRICT` | Creación/edición exige `categoryId`; restore respeta snapshot | FK (RESTRICT impide borrar categoría con artículos) | Cumple | `schema.prisma:118,132`, `init/migration.sql:166` |
| BR-007 | Una opinión pertenece obligatoriamente a un autor válido; el autor del artículo es opcional | Obligatoriedad, Integridad referencial | Opinion → Author, Article → Author | BD | `opinions.author_id NOT NULL` + FK `RESTRICT`; `articles.author_id NULL` + FK `SET NULL` | Escritura exige autor de opinión; artículo admite nulo | FK | Cumple | `schema.prisma:119,133,161,172`, `init/migration.sql:169,184` |
| BR-008 | Publicado exige `publishedAt`; la primera fecha de publicación se conserva | Temporal, Integridad | Article, Opinion | BD + API | `*_published_at_check` | `setStatus` fija fecha solo en primer publish; transición exige traducción ES | Transacción | Cumple | `init/migration.sql:215-216`, `articles.service.ts:transition` |
| BR-009 | Vocabularios controlados (status, role, locale, planning, webhook) | Integridad de dominio (soporte, no regla de negocio pura) | Todas | BD | CHECKs enumerados + tabla `locales` con FKs (M-02) + CHECKs `entity_type/mime` (M-03) | Máquinas de estado y guards presuponen estos valores | N/A | Cumple | Ver §5 BR-009 |
| BR-010 | Publicar/editar/restaurar exige traducción canónica en español | Obligatoriedad, Multi-entidad | Article/Opinion + translations | API | (soporte: FK `locale → locales`, M-02) | `UnprocessableEntity` si falta `es` al publicar, editar o restaurar | Transacción (verificación + escritura) | Cumple | `articles.service.ts:transition/schedule/restore`, `opinions.service.ts` simétrico |
| BR-011 | Slug con formato y contenido editorial no vacío | Integridad | Translations | BD | `*_slug_check` regex + `*_content_check` JSONB array `>0` | Validación de DTO + mapeo a conflicto | CHECK | Cumple | `init/migration.sql:209-212,217-218` |
| BR-012 | Transición editorial solo desde estados permitidos, idempotente | Estado/transición | Article, Opinion | API | (soporte: `*_status_check`) | `resolveTransition` + `409 invalid_transition`; no-op → 200 | Claim transaccional (ver BR-013) | Cumple | `common/transitions.ts:14-39`, `articles.service.ts:transition`, `opinions.service.ts` |
| BR-013 | Programar solo desde `review` con instante futuro; el ejecutor publica con claim atómico | Estado/transición, Temporal, Concurrencia | Article, Opinion | API (+ índice BD) | Índices parciales programados | `schedule` valida estado + futuro; `publishDue` con `updateMany` guardado en transacción; fallos conservan schedule (overdue) | Claim atómico multi-instancia | Cumple | `articles.service.ts:schedule/publishDue`, `articles.repository.ts:publishDue/findDue`, `scheduling.service.ts:tick` |
| BR-014 | Planificación sigue su propia máquina de estados con vencimientos | Estado/transición, Temporal | PlanningItem | BD + API | `planning_items_{type,priority,status}_check` | `resolvePlanningTransition` + `409`; `isOverdue`; `dueScan` audit-dedupado | Transición validada en servicio | Cumple | `planning` migration, `common/planning-transitions.ts:27-61`, `planning.service.ts:dueScan` |
| BR-015 | Operaciones de escritura exigen autenticación y rol suficiente | Autorización | User (role) | API | (soporte: `users_role_check`) | `JwtAuthGuard + RolesGuard`; audit scoping de reviewer | N/A | Cumple | `auth/roles.guard.ts:15-26`, `audit.service.ts:list`, `auth.controller.ts` |
| BR-016 | Revisiones append-only con versión monótona única por entidad | Historial/auditoría, Concurrencia | Revision | BD + API | `UNIQUE (entity_type,entity_id,version)` | `record` en transacción llamante + retry acotado ante `P2002` | UNIQUE + retry (3 intentos) | Cumple | `history` migration, `revisions.service.ts:record`, `revision.repository.ts:nextVersion/create/get` |
| BR-017 | Restaurar crea una versión nueva, nunca reescribe; bloqueado si publicado | Historial/auditoría, Estado/transición | Article/Opinion, Revision | API | (soporte: BR-016) | Doble verificación de `published` (fuera y dentro de tx) + exige `es` + `recordHistory(cause:restore)` | Transacción | Cumple | `articles.service.ts:restoreRevision`, `opinions.service.ts` simétrico |
| BR-018 | Eventos de auditoría inmutables y consultables con scoping | Historial/auditoría, Autorización | AuditEvent | API (ausencia de superficie) | Sin `UPDATE/DELETE` en repositorio (verificado: sin coincidencias) | Solo `record + list`; reviewer solo ve sus acciones | Append-only por diseño | Cumple | `audit.repository.ts:record/list`, `audit.service.ts:list` |
| BR-019 | Notificaciones inmutables excepto `readAt`; prefs 1:1 por usuario | Historial/auditoría | Notification, NotificationPref | API | PK `user_id` en prefs; FKs | Únicas mutaciones: `markRead/markAllRead` (scoping `userId`) y `upsert` de prefs (máx. 20 tipos válidos) | `updateMany` condicional | Cumple | `notifications.repository.ts:markRead/markAllRead/setPrefs`, `notifications.service.ts:emit/markRead/setPrefs` |
| BR-020 | Entrega webhook idempotente por (suscripción, entidad, acción) con claim y reaper | Concurrencia, Temporal | Webhook, WebhookDelivery | BD + API | `UNIQUE (subscription,entity,action)` + CHECKs + índices | `enqueue` vía `upsert(update:{})`; `claim` atómico pending→inflight + reaper 5 min; fan-out best-effort | Upsert + claim atómico | Cumple | `webhooks` migration, `syndication.repository.ts:enqueue/claim/dueDeliveries/settle`, `syndication.service.ts:fanout/processDue` |
| BR-021 | Borrado respeta dependencias: crítico restringe, histórico conserva, derivados en cascada | Integridad referencial | Todas | BD | `RESTRICT` (categoría/autor de opinión), `SET NULL` (autoría/auditoría/portadas), `CASCADE` (traducciones, credenciales, tokens, notificaciones, deliveries) | Borrado de artículo audita snapshot en la misma transacción | Transacción | Cumple | `init/auth/history/notifications/webhooks` migrations, `articles.service.ts:remove` |
| BR-022 | Límites operativos (bulk, prefs, paginación) | Límite/cantidad | Article (bulk), NotificationPref | API | — | Bulk > máx. → 422, por-ítem aislado sin transacción envolvente; prefs máx. 20; paginación normalizada | Sin garantía de concurrencia (diseño) | Cumple | `articles.service.ts:bulk`, `notifications.service.ts:setPrefs`, `common/pagination` |

## 5. Reglas detalladas

### BR-001 — Email de usuario único

- Regla: dos usuarios no pueden compartir email.
- Tipo: Unicidad.
- Entidades: `User`.
- Garantía: BD + API.
- BD: `UNIQUE users.email` (`schema.prisma:16`, `init/migration.sql:127`).
- API: `auth.repository.ts:findUserWithCredentialsByEmail` normaliza a minúsculas; no hay registro público (usuarios vía seed), por lo que la colisión solo puede venir de procesos admin/seed concurrentes.
- Concurrencia: la restricción UNIQUE de PostgreSQL es la garantía final.
- Estado: **Cumple**.

### BR-002 — Slug de autor único y con formato

- Regla: cada autor tiene un slug globalmente único y con formato URL.
- Tipo: Unicidad, Integridad.
- Entidades: `Author`.
- Garantía: BD + API.
- BD: `UNIQUE authors.slug` + `authors_slug_check` (`schema.prisma:63`, `init/migration.sql:130,209`).
- API: errores `P2002` se traducen a `409 slug_taken` (`articles.service.ts:asSlugConflict`).
- Concurrencia: UNIQUE.
- Estado: **Cumple**.

### BR-003 — Identificador visible único por locale (una regla conceptual, cuatro variantes materiales)

Decisión de modelado (precisión aprobada): conceptualmente es **una** regla —"el identificador visible de un contenido en un idioma no puede repetirse"— materializada en cuatro constraints porque el esquema separa traducciones por entidad.

| Variante | Constraint | Evidencia |
|---|---|---|
| 003a categorías | `UNIQUE category_translations(locale,slug)` | `schema.prisma:112`, `init/migration.sql:136` |
| 003b artículos | `UNIQUE article_translations(locale,slug)` | `schema.prisma:155`, `init/migration.sql:142` |
| 003c opiniones | `UNIQUE opinion_translations(locale,slug)` | `schema.prisma:194`, `init/migration.sql:148` |
| 003d autores | `UNIQUE author_translations(locale,name)` | `schema.prisma:82`, `init/migration.sql:133` |

- API: `P2002 → 409 slug_taken` en `articles.service.ts:756-765` (y simétricos de opiniones/categorías).
- Concurrencia: UNIQUE por variante.
- Estado: **Cumple** (una regla, cuatro evidencias).

### BR-004 — `storage_key` único

- Regla: cada asset de medios tiene una clave de almacenamiento única.
- Tipo: Unicidad. Entidades: `MediaAsset`. Garantía: BD (`UNIQUE media_assets.storage_key`, `schema.prisma:200`, `init/migration.sql:151`).
- Estado: **Cumple**.

### BR-005 — Sesión con token único, rotación y detección de reuso

- Regla: un refresh token no puede reutilizarse; las sesiones expiran y pueden revocarse.
- Tipo: Unicidad, Temporal, Autorización. Entidades: `RefreshToken`, `User`.
- BD: `UNIQUE token_hash`, FK `user_id CASCADE` (migración `20260906224552_auth`).
- API: `auth.service.ts:refresh` revoca el token presentado y emite uno nuevo; si se presenta un token ya revocado, quema la familia (`revokeFamily`) y devuelve 401; `logout` revoca; `issue` crea con TTL.
- Concurrencia: UNIQUE sobre el hash + revocación condicional.
- Estado: **Cumple**.

### BR-006 / BR-007 — Pertenencia obligatoria (categoría del artículo, autor de la opinión)

- BR-006: `articles.category_id NOT NULL` + FK `RESTRICT` (`schema.prisma:118,132`, `init/migration.sql:166`). Borrar una categoría con artículos es rechazado por la BD. **Cumple**.
- BR-007: `opinions.author_id NOT NULL` + FK `RESTRICT` (`schema.prisma:161,172`, `init/migration.sql:184`); en contraste, `articles.author_id` es anulable con `SET NULL` (decisión editorial: un artículo puede quedar sin autor atribuido, una opinión no). **Cumple**.

### BR-008 — Publicado exige `publishedAt`; primera fecha conservada

- BD: `articles_published_at_check` / `opinions_published_at_check` (`init/migration.sql:215-216`).
- API: `transition(publish)` fija `publishedAt` solo si aún no existe (`articles.service.ts:transition`); `unpublish` conserva historial.
- Estado: **Cumple**.

### BR-009 — Vocabularios controlados (clasificación según evidencia)

Decisión (precisión aprobada): estos CHECKs son **restricciones de dominio/soporte**, no reglas de negocio independientes. Se documentan juntos porque su valor está en sostener las máquinas de estado, no en describir comportamiento por sí mismos:

- `status IN (draft,review,published,archived)` artículos/opiniones; `planning status/type/priority`; `webhook status/action`; `role IN (admin,editor,reviewer)` (ampliado en `20260916000000_reviewer-role`); `locale` como tabla `locales` con FKs (M-02, antes `locale IN (es,en)`); `entity_type` polimórfico y `mime` con CHECKs cerrados (M-03).
- Evidencia: `init/migration.sql:204-208,213-214`, `planning` migration `:22-24`, `webhooks` migration `:34-35`.
- Estado: **Cumple** como soporte. Las reglas de comportamiento reales son BR-012/BR-014/BR-015.

### BR-010 — Traducción canónica en español requerida

- Regla: no se puede publicar, editar a `review` ni restaurar sin traducción `es`.
- Tipo: Obligatoriedad, Multi-entidad. Garantía: API (`UnprocessableEntityException('Spanish translation is required…')` en `articles.service.ts:transition/schedule/restore` y simétrico en `opinions.service.ts`).
- Estado: **Cumple**.

### BR-011 — Formato de slug y contenido no vacío

- BD: `*_slug_check` + `*_content_check` (`init/migration.sql:209-212,217-218`).
- Estado: **Cumple** (integridad de dominio).

### BR-012 — Transiciones editoriales

- Matriz bloqueada en `common/transitions.ts:14-39`: `publish` solo desde `review`; `unpublish` desde `published→draft`; `archive` desde `published|draft`; `restore` desde `archived→draft`; `reject` desde `review→draft`. Idempotente (no-op → 200), resto → `409 invalid_transition`.
- Servicios la aplican dentro de transacciones con historial (`articles.service.ts:transition`, `opinions.service.ts`).
- Estado: **Cumple**. No puede expresarse con un CHECK simple (requiere conocer estado anterior + acción), por eso vive en backend (§8).

### BR-013 — Scheduling

- `schedule` exige `status=review` e instante futuro (`articles.service.ts:475-487`); limpiar es idempotente.
- Ejecutor `publishDue`: reclama con `updateMany({where:{id,status:review,scheduledAt}})` (`articles.repository.ts:386-397`) dentro de transacción; si `count=0` otro tick ganó (multi-instancia seguro). Fallos de validación conservan schedule y quedan como overdue + `schedule.failed`.
- Índices parciales programados en `20260913000000_scheduling`.
- Estado: **Cumple**.

### BR-014 — Planning

- CHECKs + `resolvePlanningTransition` (`common/planning-transitions.ts:27-54`) + `isOverdue` (`:57-61`) + `dueScan` audit-dedupado (`planning.service.ts:300-330`).
- Estado: **Cumple**.

### BR-015 — Autorización por rol

- `RolesGuard` (`auth/roles.guard.ts:15-26`) + `JwtAuthGuard`; reviewer con visión recortada de auditoría (`audit.service.ts:list`).
- `users_role_check` es solo soporte.
- Estado: **Cumple**.

### BR-016 — Revisiones append-only con versión única

- BD: `UNIQUE (entity_type,entity_id,version)` (`history` migration).
- API: `revisions.service.ts:record` calcula `nextVersion` e inserta en la tx llamante, con retry acotado ante `P2002`.
- Repositorio sin `update/delete` (verificado por búsqueda sin coincidencias).
- Estado: **Cumple**.

### BR-017 — Restore seguro

- Crea nueva versión con `cause:restore`, nunca reescribe; doble verificación de `published` (fuera y dentro de la tx); el `status` nunca viene del snapshot; exige `es`.
- Evidencia: `articles.service.ts:restoreRevision` (+ simétrico opiniones).
- Estado: **Cumple**.

### BR-018 — Auditoría inmutable

- Semántica verificada: `audit.repository.ts` solo expone `record` + `list`; no existe `update/delete/upsert` en el módulo `history`. Garantía por **ausencia de superficie**, no por constraint DB (PostgreSQL permitiría modificar si alguien escribe directo; la protección real es API + convención append-only).
- Scoping: reviewer solo ve sus propias acciones.
- Estado: **Cumple** (con la nota de garantía anterior; ver riesgo en §7).

### BR-019 — Notificaciones (semántica verificada, no sobrestimada)

- Verificación: las únicas escrituras son `createMany` (fan-out), `markRead/markAllRead` y `setPrefs`. No hay `update` genérico ni `delete`. `markRead` usa `updateMany({where:{id,userId,readAt:null}})` (`notifications.repository.ts:59-71`): solo el dueño puede marcar lo no leído; el resto de columnas es inmutable por diseño.
- Prefs: `upsert` por PK `user_id`, máximo 20 tipos válidos (`notifications.service.ts:101-104`).
- Fan-out best-effort que nunca rompe la acción editorial (`notifications.service.ts:49-71`): una caída se registra como warning y se pierde (riesgo aceptado, ver §7).
- Estado: **Cumple**.

### BR-020 — Webhooks (semántica verificada, no sobrestimada)

- Idempotencia real: `enqueue` hace `upsert` con `update:{}` sobre `UNIQUE (subscription,entity,action)` (`syndication.repository.ts:90-116`): reintentos colapsan en la misma fila, no duplican.
- Concurrencia real: `claim` atómico pending→inflight con reaper de 5 min (`:131-143`), `dueDeliveries` (`:186-198`), `settle` con reintentos y `purgeDeliveries` solo de terminales (`:200-204`).
- Fan-out best-effort post-commit (`syndication.service.ts:fanout`), worker en el tick (`scheduling.service.ts:tick`).
- Estado: **Cumple**.

### BR-021 — Políticas de borrado

- `RESTRICT`: categoría con artículos, autor con opiniones. `SET NULL`: autoría, programador, portadas, actor de historial. `CASCADE`: traducciones, credenciales, tokens, notificaciones, deliveries.
- Borrado de artículo audita snapshot en la misma transacción (`articles.service.ts:remove`).
- Estado: **Cumple**.

### BR-022 — Límites operativos

- Bulk: máximo por lote → 422; cada id aislado, sin transacción envolvente (fallo de uno no revierte otros), con auditoría por fallo (`articles.service.ts:bulk`).
- Prefs: máximo 20 tipos; paginación normalizada en todos los listados.
- Tipo: Límite/cantidad. Garantía: API. Estado: **Cumple**.

## 6. Reglas del apunte no aplicables al dominio actual

`N/A — dominio editorial, no ecommerce.` No existen `Product`, `Order`, `OrderItem`, `Invoice`, `Stock`, precio ni inventario, por lo que no se marcan como incumplimientos:

- Comprar sin stock / stock insuficiente / compra concurrente de últimas unidades.
- Precio negativo, precio inmutable en la orden, inventario post-venta.
- Orden sin cliente, orden con ≥1 producto, factura asociada a venta, producto descontinuado no vendible.
- Cancelar solo si no enviado (equivalencia conceptual: BR-012/BR-013 — publicar/schedule solo desde `review`, restore bloqueado si `published`).
- Unicidad de email (sí tiene equivalencia directa: BR-001).
- Artículo publicado con autor/categoría (equivalencia: BR-006/BR-007/BR-010).

## 7. Gaps y riesgos

### Cumple (22 reglas)

BR-001…BR-022 con evidencia citada. Garantizadas por PostgreSQL: BR-001…BR-008 (parcial), BR-011, BR-016 (unicidad), BR-020 (unicidad), BR-021. Garantizadas principalmente por NestJS: BR-010, BR-012…BR-015, BR-017…BR-019. Multicapa (BD + API): BR-001…BR-003, BR-005…BR-008, BR-013…BR-014, BR-016, BR-020…BR-021.

### Parcial

Ninguna regla de negocio requerida por el dominio actual queda a medio garantizar en una capa insuficiente. (Si en el futuro se exige inmutabilidad de auditoría frente a escritura directa a DB, BR-018 pasaría a Parcial hasta agregar triggers `BEFORE UPDATE/DELETE ... FORBID` o permisos de rol — decisión explícitamente no tomada, ver §8.)

### Riesgos (diseño intencional, documentados como tales)

- Fan-out best-effort (notificaciones y webhooks) puede perder eventos ante caídas; nunca rompe la acción editorial por diseño (`notifications.service.ts:emit`, `syndication.service.ts:fanout`, `scheduling.service.ts:tick`).
- Bulk sin transacción envolvente: aislamiento por ítem (un fallo no revierte otros).
- BR-018/BR-016 dependen de ausencia de superficie API, no de prohibición a nivel DB.
- Documentación arquitectónica desactualizada (`docs/architecture.md`, `folder-structure.md`, `getting-started.md`) contradice al código; la válida es `ADR-012` + features. Riesgo de onboarding, no de integridad.

### Necesita investigación (1)

- Política de retención/purga de `webhook_deliveries` terminales (`purgeDeliveries(before)` existe pero el llamante/ventana de retención no se audita aquí como regla de negocio; no se afirma ni se niega regla).

### Nota sobre candidatas descartadas

- `BR-023 (createdAt/updatedAt)`: excluida como regla independiente. Los timestamps existen en casi todas las tablas y **soportan** historial/ordenación/auditoría (BR-008/BR-013/BR-016…), pero no hay una regla del tipo "X debe registrarse con fecha" que los exija por sí mismos. Si el rediseño introduce SLAs o retención temporal, reabrir como regla.

## 8. Conclusión

Newshub representa correctamente sus reglas de negocio editoriales: unicidad e integridad en PostgreSQL (UNIQUE, FK, CHECK, índices parciales) + workflow, autorización, scheduling, historial y concurrencia en NestJS (máquinas de estado, guards, transacciones, claims atómicos, upserts idempotentes, retries). La distribución BD/API/frontend respeta el apunte (frontend nunca autoridad; DB garantiza integridad independiente del escritor; backend aporta comportamiento). No se encontró lógica de negocio compleja indebida en la DB (sin triggers; CHECKs solo para invariantes expresables), lo cual es correcto.

Resumen: **22 reglas reales identificadas; 22 cumplen; 0 parciales; 3 riesgos de diseño aceptado (fan-out, bulk, garantía por ausencia); múltiples N/A de ecommerce; 1 necesita investigación (retención de deliveries).** Garantizadas por PostgreSQL (total o parcial): BR-001…BR-009, BR-011, BR-016, BR-020, BR-021. Principalmente por NestJS: BR-010, BR-012…BR-015, BR-017…BR-019, BR-022. Multicapa: BR-001…BR-003, BR-005…BR-008, BR-013…BR-014, BR-016, BR-020, BR-021.

Gaps reales para el futuro rediseño: (a) crear la matriz BR era inexistente — este documento la inaugura; (b) actualizar `docs/architecture.md`/`folder-structure.md`/`getting-started.md`; (c) decidir si la inmutabilidad de auditoría merece prohibición a nivel DB; (d) definir política de retención de deliveries/notificaciones; (e) si el negocio pidiera multi-categoría por artículo, el actual `category_id` único exigiría tabla puente (evolución prevista por el apunte, no fallo actual).
