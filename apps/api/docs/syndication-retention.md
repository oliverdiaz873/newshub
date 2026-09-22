# R-1 — Política de retención de Syndication Deliveries (decisión)

## 1. Problema

`webhook_deliveries` es la única tabla de crecimiento potencialmente ilimitado ligada a eventos (una fila por suscripción × pieza × acción). Hasta esta fase, su retención era un comportamiento implementado pero no una regla documentada: existía `DELIVERY_RETENTION_DAYS = 30` y purga automática sin justificación registrada, sin tests y sin matriz BR que la declarara (el informe anterior la marcó —imprecisamente— como "llamante no auditado"; corrección: el llamante es `processDue`, ver §2). R-1 convierte ese comportamiento en regla + decisión + plan verificable.

## 2. Comportamiento actual (hechos comprobados)

- **Qué es un delivery**: intento de entrega de un evento (`published`/`unpublished` de `article`/`opinion`) a una suscripción webhook. Creación: `fanout` post-commit, una fila por suscripción activa suscrita al evento, idempotente por `UNIQUE (subscription,entity,action)` (`syndication.repository.ts:enqueue`).
- **Estados reales**: `pending → inflight → delivered | failed` (CHECK `webhook_deliveries_status_check`; no existen `success`/`retrying` como estados — el reintento es `pending` con `nextAttemptAt` futuro y `attempts` incrementado). Reintentos: backoff `WEBHOOK_RETRY_MS = [60s, 5m, 15m]`, máximo `WEBHOOK_MAX_ATTEMPTS = 3`, claim atómico con reaper de 5 min (`syndication.service.ts:processDue`, `syndication.repository.ts:claim/settle`).
- **Retención implementada**: al final de cada tick (`@Cron(EVERY_MINUTE)` vía `scheduling.service.ts:tick` → `processDue`), se ejecuta `purgeDeliveries(now − 30 días)` (`syndication.service.ts:13,337`), que borra físicamente solo filas `delivered/failed` con `createdAt` anterior (`syndication.repository.ts:200-204`). **Pendientes e inflight jamás son tocados** — la protección de datos activos es estructural, no condicional.
- **Consumidores de deliveries antiguos**: solo `GET /webhooks/:id/deliveries` (admin, paginado, por suscripción). Ningún worker, retry, métrica o E2E depende de deliveries viejos (verificado por búsqueda: `purgeDeliveries` solo se llama desde `processDue`; el spec solo cubre HMAC).
- **Ciclo de vida ligado al webhook**: borrar suscripción elimina sus deliveries (`CASCADE`, auditado como `webhook.unsubscribe`); desactivar lleva a `settle failed` y purga a los 30 días; rotar el secret no afecta deliveries.
- **Volumen**: crecimiento acotado por el upsert idempotente (eventos × suscripciones activas). Dev actual: 0 webhooks / 0 deliveries (sin datos de producción para calibrar — ver §5).
- **Brechas**: sin tests de purga/proceso (spec de 19 líneas, solo firmas), sin justificación documentada del valor 30, purga no auditada fila a fila (solo observable por ausencia).

## 3. Regla de negocio (nueva, real)

> **BR-023 — Los deliveries terminales (`delivered`/`failed`) se conservan 30 días desde su creación y luego se purgan; los deliveries activos (`pending`/`inflight`) nunca se purgan.**
> Tipo: Temporal, Límite/cantidad. Entidades: `WebhookDelivery`. Garantía: API (proceso del tick) + scope en repositorio. Concurrencia: purga por `createdAt` sobre filas terminales; los claims atómicos protegen las activas. Evidencia: `syndication.service.ts:13,311-342`, `syndication.repository.ts:200-204`, `scheduling.service.ts:tick`. Estado: **Cumple**.

Se usa un ID nuevo porque corresponde: es un comportamiento real aplicado por el sistema, no una aspiración.

## 4. Estados

| Estado | Tratamiento | Fundamento |
|---|---|---|
| `pending` (incluye reintentos programados) | Nunca purgado | Podría ser necesario para completar su ciclo (regla absoluta del brief) |
| `inflight` | Nunca purgado | Claim activo o reaper pendiente |
| `delivered` | Purgado si `createdAt` > 30 días | Valor de debug decae; el hecho de negocio (publicación) vive en `revisions`/`audit_events` |
| `failed` (terminal, sin `nextAttemptAt`) | Purgado si `createdAt` > 30 días | El error queda 30 días para troubleshooting; la acción administrativa vive en `audit_events` |

## 5. Alternativas comparadas (ninguna implementada en esta fase)

- **A. Indefinida**: rechazada — crecimiento ilimitado sin beneficio (el único lector es un admin paginado; el historial de negocio ya existe en `revisions`/`audit_events`).
- **B. Eliminación física con ventana (actual, 30 d)**: propuesta — simple, segura por construcción, costo nulo, rollback trivial (cambiar la constante). Riesgo: ventana sin justificación de producto (aceptado, ver §8).
- **C. Archivado a tabla histórica**: rechazada por ahora — sobreingeniería a este volumen; reabrir si regulación o volumen lo exigen (la purga actual no impide agregarla después: el corte por `createdAt` es el mismo).
- **D. Híbrida (operativo X + resumen Y)**: rechazada — el "resumen" ya existe gratis vía `audit_events` (`webhook.subscribe/update/unsubscribe/rotate/ping`).

Períodos 30/90/180: el brief prohíbe inventarlos; 30 se **conserva** por ser el implementado y de bajo riesgo de cambio, no por cálculo. Dato pendiente: confirmación de producto + volumen real en producción.

## 6. Criterios de decisión aplicados

Necesidad operativa (proteger activos: estructural ✅) · auditoría (hechos preservados en `audit_events`/`revisions` ✅) · volumen (acotado por upsert; sin datos prod: pendiente no bloqueante) · troubleshooting (30 d de `responseCode`/`error`/`attempts` ✅) · retries (intocables ✅) · simplicidad (constante + `deleteMany`, sin infra nueva ✅) · compatibilidad PR #39 (sin CASCADE a piezas, sin enums, sin cron nuevo: la purga viaja en el tick existente ✅).

## 7. Diseño técnico (ya implementado; guía para futuros cambios)

El proceso existe y no se modifica: `processDue` → retries → `purgeDeliveries(cutoff)` en el mismo tick, fuera de transacción envolvente, best-effort con warning (nunca rompe la acción editorial). Si un futuro cambio ajusta la ventana: cambiar solo `DELIVERY_RETENTION_DAYS`, mantener el predicado (`status IN (delivered,failed) AND createdAt < cutoff`), verificación pre/post por conteos por estado, y test del predicado (brecha actual a cerrar en la fase de implementación, no aquí).

## 8. Riesgos (y por qué están contenidos)

- Eliminar activos: imposible por predicado (solo terminales). Riesgo residual: cambio futuro del predicado — mitigado por esta regla + test pendiente.
- Interferencia con retries: imposible (pendientes intocables; reintento vive en la misma fila).
- Pérdida de evidencia: acotada a 30 d de debug; hechos de negocio duplicados en auditoría.
- Crecimiento: acotado por upsert idempotente; purga mensual implícita por tick.
- Bloqueos: `deleteMany` por índice de `createdAt` sobre tabla pequeña; sin transacción larga.
- Fallo/duplicación del cleanup: idempotente por predicado (re-ejecutable); fallo visible en warning sin romper el tick.

## 9. Compatibilidad

NestJS modular (todo dentro de `syndication` + tick existente) · Prisma (sin cambios de schema) · PostgreSQL (SQL existente) · BR-001…BR-022 intactas · PR #39 intacto (sin CASCADE a piezas, sin cron/microservicio/Redis/S3/colas nuevas) · E2E centralizado sin tocar.
