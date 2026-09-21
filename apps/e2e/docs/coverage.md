# Cobertura E2E — Newshub (estado real)

> Artefacto de trazabilidad, no de metodología. La metodología general de
> auditoría E2E se mantiene fuera del repositorio; este archivo registra
> únicamente el estado real de cobertura de Newshub a la fecha de la última
> validación: **suite 46/46 en verde**, `type-check` y `lint` verdes,
> `git diff --check` limpio.

## 1. Scope

- **Harness**: `apps/e2e` (Playwright Test como autoridad determinista) sobre
  API `:3211` + Dashboard `:3212` + Storefront `:3210` contra la base aislada
  `newshub_e2e` (reseed determinista por corrida).
- **Funcionalidades consideradas**: autenticación y sesión, roles y permisos,
  CRUD editorial, workflow de revisión, publicación, búsqueda, planificación y
  programación, notificaciones, sindicación, media, categorías/autores,
  historial/auditoría, storefront público ES/EN, i18n y comportamiento
  cross-app Dashboard → API → Storefront.
- La cobertura se analiza **desde la funcionalidad del sistema hacia los
  tests**, no desde el número de tests.
- **No se persigue 100% E2E**: cada comportamiento vive en la capa más barata
  que puede demostrarlo (Unit / API / E2E / MCP / N/A).

## 2. Matriz de cobertura funcional

Estados: `Cubierto` · `Parcial` · `Explorado (MCP)` · `Excluido intencional`.

| Funcionalidad | Riesgo | Escenario relevante | Capa | Test / mecanismo | Estado |
|---|---|---|---|---|---|
| Auth | Alto | Login válido / password inválida / logout | E2E | `auth.spec.ts` | Cubierto |
| Auth | Alto | Expiración/refresh/reuso, rate-limit 429 | API | Módulo `auth` (guards, throttler) | Cubierto |
| Auth | Medio | Redirect `?next=` tras login | MCP | Sesión de cierre (observado) | Explorado (MCP) |
| Roles | Crítico | Editor crea/edita; reviewer sin crear; admin exclusivo syndication | E2E | `permissions.spec.ts`, `analytics.spec.ts`, `syndication.spec.ts`, `review-approval.spec.ts` | Cubierto |
| Roles | Crítico | Reviewer publica/rechaza en revisión | E2E | `review-approval.spec.ts` | Cubierto |
| Roles | Crítico | Anónimo bloqueado (UI + API 401) | E2E | `permissions.spec.ts` | Cubierto |
| Artículos | Alto | CRUD draft | E2E | `articles.spec.ts` | Cubierto |
| Opiniones | Alto | CRUD (con autor obligatorio) | E2E | `opinions.spec.ts` | Cubierto |
| Categorías | Medio | CRUD + validación de slug | E2E | `categories.spec.ts` | Cubierto |
| Categorías | Alto | Borrado con piezas → 409, nada se elimina | E2E | `category-guard.spec.ts` | Cubierto |
| Autores | Medio | CRUD + bloqueo con opiniones asociadas | E2E | `authors.spec.ts` | Cubierto |
| Media | Medio | Upload, portada, borrado protegido/liberado | E2E | `media.spec.ts` | Cubierto |
| Media | Medio | Tipo/tamaño/MIME falsificado → 422 | API | Módulo `media` (sharp, límites) | Cubierto |
| Bulk | Medio | Archivar N seleccionados con confirmación | E2E | `bulk-archive.spec.ts` | Cubierto |
| Bulk | Bajo | Publish/unpublish/reject/delete masivos | N/A | Mismo mecanismo; un caso representa | Excluido intencional |
| Review | Crítico | Editor envía → reviewer aprueba → published | E2E | `review-approval.spec.ts` | Cubierto |
| Review | Crítico | Rechazo con motivo → draft + notificación | E2E | `review-approval.spec.ts` | Cubierto |
| Publishing | Crítico | Publish → visible → unpublish → 404; archive/restore | E2E | `publishing.spec.ts` | Cubierto |
| History | Medio | Versiones + diff + deep-link auditoría + detalle | E2E | `history-audit.spec.ts` | Cubierto |
| History | Bajo | Ejecutar Restore como regresión | MCP | Sesión de cierre (append-only, con confirmación) | Explorado (MCP) |
| Planning | Medio | Pitch→assign→start→submit→complete + reviewer + calendario | E2E | `planning.spec.ts` | Cubierto |
| Scheduled | Alto | Programar → visible (UTC) → cancelar → vacío | E2E | `scheduled.spec.ts` | Cubierto |
| Scheduled | Alto | Publicar ahora → publicado + visible | E2E | `scheduled.spec.ts` | Cubierto |
| Scheduled | Bajo | Tick del cron (auto-publicación al vencer) | N/A | Worker; fuera de E2E por diseño | Excluido intencional |
| Notifications | Alto | Lectura individual + deep-link al editor | E2E | `notifications-flow.spec.ts` | Cubierto |
| Notifications | Medio | Prefs toggle, read-all condicional | E2E | `review-approval.spec.ts` | Parcial |
| Notifications | Bajo | Badge/polling ~30s | MCP | Sesión Fase 2 (observado, frágil como assert) | Explorado (MCP) |
| Notifications | Bajo | mutedTypes | API | Fan-out con preferencias | Cubierto |
| Syndication | Alto | Webhooks CRUD/secreto/ping/rotate/delete + bloqueo editor | E2E | `syndication.spec.ts` | Cubierto |
| Syndication | Alto | Publish → delivery registrada (pending válido) | E2E | `syndication-delivery.spec.ts` | Cubierto |
| Syndication | Medio | Feed RSS público con publicados | MCP | Sesión Fase 2 (observado) | Explorado (MCP) |
| Syndication | Bajo | Reintentos/HMAC | API | Servicio `syndication` | Cubierto |
| Search | Crítico | Con/sin resultados, unaccent, EN-fallback, no-fetch, SEO meta, stale-race, 500, publish↔search | E2E | `search.spec.ts` | Cubierto |
| Storefront | Alto | Home ES, detalle de artículo | E2E | Visitadas por `publishing`/`search` sin asserts propios + MCP | Parcial |
| Storefront | Alto | Categoría válida / inválida-404 | E2E | `storefront-public.spec.ts` | Cubierto |
| Storefront | Alto | Detalle de opinión + relacionadas | E2E | `storefront-public.spec.ts` | Cubierto |
| Storefront | Medio | Home EN (nav/headers traducidos) | E2E | `storefront-public.spec.ts` | Cubierto |
| Storefront | Bajo | Legal/footer/tema/selector idioma | N/A | Unit/visual; sin contrato E2E | Excluido intencional |
| i18n/API | Medio | Solo-EN 422, slug cruzado 404, fallback `true` | API | Módulo `locale` y servicios | Cubierto |
| Analytics | Bajo | Widgets + bloqueo reviewer | E2E | `analytics.spec.ts` | Cubierto |
| Auditoría | Bajo | Filtros directos del board (fuera del deep-link) | E2E | Cubierto vía `history-audit.spec.ts` en flujo guiado | Parcial |
| Overview | Bajo | KPIs y cola (Tier 1) | E2E | `analytics.spec.ts` | Cubierto |
| Settings | Bajo | Prefs; density/previewLang | E2E | Prefs en `review-approval.spec.ts`; resto sin test | Parcial |

## 3. Escenarios E2E implementados (`apps/e2e/tests/`, 20 specs, 46 tests)

Base previa (13): `auth`, `articles`, `opinions`, `categories`, `authors`,
`media`, `permissions`, `planning`, `publishing`, `review-approval`,
`search`, `analytics`, `syndication`.

Fase de cobertura (7 nuevos): `storefront-public` (categoría válida/inválida,
opinión-detail, EN smoke), `history-audit` (versiones, diff, audit-link,
detalle), `category-guard` (409 + integridad), `notifications-flow`
(single-read + deep-link), `scheduled` (programar→cancelar, publicar ahora),
`syndication-delivery` (publish → delivery), `bulk-archive` (caso
representativo).

Correcciones de aislamiento: `review-approval.spec.ts` y `planning.spec.ts`
limpian sus datos propios (antes dejaban publicados/planificaciones).

## 4. Riesgos residuales (fuera de la automatización E2E)

- Badge de notificaciones: validado solo por observación MCP (polling ~30s;
  frágil como assert).
- Restore como acción automatizada: explorado por MCP (seguro y con
  confirmación); pospuesto hasta declarar criticidad.
- Cron de scheduling, reintentos/HMAC de webhooks, validaciones MIME/DTO,
  JWT/rate-limit: cubiertos por API/Unit, no por E2E.
- SEO exhaustivo (hreflang/OG/sitemap) y pixel testing: fuera de alcance.
- Hallazgo de producto pendiente (no cobertura): guard de categoría sin
  mensaje persistente y clave `articles.confirm` sin traducir en el diálogo
  bulk — documentados para issue, sin E2E que los exija.

## 5. Exclusiones intencionales (motivo)

- 5 variantes bulk: un mecanismo, un test representativo.
- Restore automatizado: sin criticidad declarada.
- Badge, SEO exhaustivo, legal/footer/tema, pixel testing: bajo valor o
  fragilidad como regresión.
- Reglas puras de API (422/409/429, expiración, mutedTypes, slug cruzado):
  otra capa las demuestra más barato; E2E no las duplica.
- Cron/worker: tiempo real no determinista; se valida el contrato observable
  (fila programada, delivery registrada).

## 6. Conclusión

La suite E2E cubre los workflows críticos identificados (editorial completo,
publicación cross-app, búsqueda, scheduling, sindicación, notificaciones
operativas, permisos). Lo no cubierto por E2E vive en Unit/API o fue excluido
por bajo valor/fragilidad con motivo registrado. MCP queda como herramienta
de exploration/discovery (Fase 2 y sesión de cierre evidenciadas en
`.tmp/mcp-output/`, gitignored). No se persigue 100% E2E artificial:
**ningún comportamiento crítico queda sin estrategia de validación.**
