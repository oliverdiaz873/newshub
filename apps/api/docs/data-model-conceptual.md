# Modelo conceptual de datos — Newshub

## 1. Posición en la secuencia de rediseño

```
Reglas de negocio (business-rules.md, 22 BR) ✅
  → Entidades ⬅ ESTE DOCUMENTO
  → Relaciones
  → Cardinalidades
  → Modelo conceptual
  → (después) Modelo lógico relacional → Constraints → Índices →
     Normalización → Evolución/migraciones → Prisma schema → Migraciones → Validación
```

Este documento no modifica nada: no toca `schema.prisma`, migraciones, servicios ni frontend. Define **qué existe** en el dominio y **cómo se relaciona**, antes de decidir cómo reorganizar físicamente PostgreSQL.

Fuentes primarias: `apps/api/prisma/schema.prisma`, migraciones `20260906…20260919`, y las reglas BR-001…BR-022 de `apps/api/docs/business-rules.md` (cada relación cita la BR que la exige).

## 2. Catálogo de entidades (qué representa cada concepto)

| Entidad | Qué representa | Identidad | Ciclo de vida |
|---|---|---|---|
| User | Persona del staff editorial (admin, editor, reviewer). No hay usuarios lectores registrados. | UUID, `email` único (BR-001) | Creado por seed/admin; nunca se auto-registra (sin endpoint público) |
| UserCredential | Secreto de acceso de un User (hash argon2). Extensión 1:1, no entidad autónoma. | PK = `user_id` | Nace/muere con su User (`CASCADE`) |
| RefreshToken | Sesión activa de un User. | UUID, `token_hash` único (BR-005) | Rotación continua; expira, se revoca, quema familia ante reuso |
| Author | Firma pública (persona o columna) que firma artículos y opiniones. Independiente del User que lo edita. | UUID, `slug` único (BR-002) | Curaduría editorial; `RESTRICT` protege al autor con opiniones |
| AuthorTranslation | Nombre/bio de un autor en un idioma. Entidad débil (sin identidad sin su autor). | `(author_id, locale)` | `CASCADE` con su autor |
| Category | Sección del periódico (política, cultura…). Eje de navegación pública. | UUID | `RESTRICT`: no se borra con artículos (BR-006/BR-021) |
| CategoryTranslation | Etiqueta/slug de una sección por idioma. Entidad débil. | `(category_id, locale)`, `UNIQUE (locale,slug)` (BR-003a) | `CASCADE` |
| Article | Pieza informativa. El agregado raíz editorial: su `status` gobierna publicación, scheduling e historial. | UUID | `draft → review → published ⇄ archived`; programable |
| ArticleTranslation | Versión legible de un artículo en un idioma (título, resumen, contenido JSONB). Entidad débil. | `(article_id, locale)`, `UNIQUE (locale,slug)` (BR-003b) | `CASCADE`; `es` obligatoria para publicar (BR-010) |
| Opinion | Pieza de opinión, siempre firmada por un autor. Gemela estructural del artículo con regla de autoría más estricta. | UUID | Mismo workflow que Article |
| OpinionTranslation | Versión legible de una opinión por idioma. Entidad débil. | `(opinion_id, locale)`, `UNIQUE (locale,slug)` (BR-003c) | `CASCADE`; `es` obligatoria (BR-010) |
| MediaAsset | Imagen/archivo usable como portada. Se referencia, no se incrusta. | UUID, `storage_key` único (BR-004) | Huérfano permitido (nada impide assets sin uso — ver §6) |
| Revision | Foto versionada (`snapshot` JSONB) del estado de un artículo/opinión tras cada cambio. Historial, no contenido vivo. | UUID; orden por `UNIQUE (entity_type,entity_id,version)` (BR-016) | Append-only; nunca se actualiza ni borra desde la API |
| AuditEvent | Hecho ocurrido (login, publish, delete…) con actor y metadata. Trazabilidad, no estado. | UUID, ordenado por `at` | Append-only; solo `record + list` (BR-018) |
| Notification | Mensaje en la bandeja de un miembro del staff sobre un evento editorial. | UUID | Inmutable excepto `readAt` (BR-019) |
| NotificationPref | Preferencias de silencio de un User (tipos muteados). Extensión 1:1. | PK = `user_id` | `upsert`, máx. 20 tipos (BR-019/BR-022) |
| PlanningItem | Idea o encargo de cobertura (pitch/assignment) con responsable, revisor, prioridad y vencimiento. Puede enlazar a una pieza producida. | UUID | `pitched → … → done/cancelled` (BR-014) |
| Webhook | Suscripción saliente de un integrador a eventos `published/unpublished`. | UUID | Activable/desactivable; secreto rotable |
| WebhookDelivery | Intento de entrega de un evento a una suscripción. | UUID; idempotencia por `UNIQUE (subscription,entity,action)` (BR-020) | `pending → inflight → delivered/failed` con reaper |

No existen en el dominio: Product, Order, Stock, Precio, Factura (ver `business-rules.md` §6, N/A).

## 3. Relaciones y cardinalidades

Notación: `A — B` se lee "un A se relaciona con N B". Obligatoriedad desde el lado hijo (¿puede existir el hijo sin el padre?).

### 3.1 Contenido editorial (núcleo)

| Relación | Tipo | Obligatoriedad |Implementación física | BR |
|---|---|---|---|---|
| Category — Article | 1:N | Obligatoria (todo artículo tiene exactamente 1 categoría) | `articles.category_id NOT NULL`, FK `RESTRICT` | BR-006 |
| Author — Article | 1:N | Opcional (artículo puede no tener autor) | `articles.author_id NULL`, FK `SET NULL` | BR-007 |
| Author — Opinion | 1:N | Obligatoria (toda opinión tiene exactamente 1 autor) | `opinions.author_id NOT NULL`, FK `RESTRICT` | BR-007 |
| MediaAsset — Article (portada) | 1:N | Opcional | `articles.cover_media_id NULL`, FK `SET NULL` | BR-021 |
| MediaAsset — Opinion (portada) | 1:N | Opcional | `opinions.cover_media_id NULL`, FK `SET NULL` | BR-021 |
| Article — ArticleTranslation | 1:N | Obligatoria (≥1 traducción; `es` exigida para publicar) | `CASCADE`, PK compuesta | BR-010, BR-003b |
| Opinion — OpinionTranslation | 1:N | Obligatoria (idem) | `CASCADE`, PK compuesta | BR-010, BR-003c |
| Category — CategoryTranslation | 1:N | Obligatoria (sin etiqueta no hay sección visible) | `CASCADE`, PK compuesta | BR-003a |
| Author — AuthorTranslation | 1:N | Obligatoria (sin nombre no hay firma visible) | `CASCADE`, PK compuesta | BR-003d |

### 3.2 Identidad y sesión

| Relación | Tipo | Obligatoriedad | Implementación física | BR |
|---|---|---|---|---|
| User — UserCredential | 1:1 | Obligatoria del lado credencial | PK compartida `user_id`, `CASCADE` | BR-005 |
| User — RefreshToken | 1:N | Obligatoria del lado token | `user_id NOT NULL`, `CASCADE`, `UNIQUE token_hash` | BR-005 |
| User — NotificationPref | 1:1 | Opcional (el usuario puede no tener prefs) | PK compartida `user_id`, `CASCADE`, `upsert` | BR-019 |

### 3.3 Autoría, programación y asignación (User como actor, todo opcional)

Todas 1:N opcionales con `SET NULL` (si el usuario desaparece, el contenido conserva su historia sin el actor):

User — Category (`createdBy/updatedBy`), Article (`createdBy/updatedBy/scheduledBy`), Opinion (`createdBy/updatedBy/scheduledBy`), MediaAsset (`createdBy`), Revision (`actor`), AuditEvent (`actor`), Notification (`user` obligatoria `CASCADE` / `actor` opcional), PlanningItem (`assignee/reviewer/createdBy/updatedBy`), Webhook (`createdBy`). Evidencia: `schema.prisma:22-42,93-94,125-136,167-175,204-206,240-244,254-259,271-277,298-314,331-334`. BR-015, BR-021.

### 3.4 Planificación y distribución

| Relación | Tipo | Obligatoriedad | Implementación física | BR |
|---|---|---|---|---|
| Category — PlanningItem | 1:N | Opcional | `category_id NULL`, `SET NULL` | BR-014 |
| Webhook — WebhookDelivery | 1:N | Obligatoria del lado entrega | `subscription_id NOT NULL`, `CASCADE`, `UNIQUE (subscription,entity,action)` | BR-020 |
| Notification destinatario | N:1 obligatoria | Toda notificación tiene exactamente 1 destinatario | `user_id NOT NULL`, `CASCADE` | BR-019 |

### 3.5 Relaciones polimórficas (lógicas, SIN FK física)

Hallazgo central de esta fase: cuatro conceptos referencian "cualquier pieza" solo con `(entity_type, entity_id)` de texto, sin constraint referencial:

| Origen | Apunta a | Garantía real | BR |
|---|---|---|---|
| Revision | Article / Opinion | `UNIQUE (entity_type,entity_id,version)` + escritura transaccional; nada impide `entity_id` huérfano | BR-016 |
| AuditEvent | cualquier entidad | Ninguna a nivel BD; solo convención de escritura | BR-018 |
| Notification | cualquier entidad | Ninguna a nivel BD; `entity_id` anulable | BR-019 |
| PlanningItem | pieza producida (`entity_type/entity_id`) | Ninguna a nivel BD; enlace informativo | BR-014 |

Consecuencia: borrar una pieza no limpia su historial (por diseño: el historial sobrevive), pero tampoco hay forma declarativa de saber qué tipos de entidad son válidos ni de listar "todo lo relacionado con X" con joins. Es la decisión que más condiciona el modelo lógico futuro (ver §6.4).

### 3.6 Relaciones N:M

**No existe ninguna.** Todo el modelo actual es 1:N o 1:1. En particular no hay tabla puente en ningún punto — incluso donde el negocio podría pedirla (ver §6.1).

## 4. Modelo conceptual (ER textual)

```
USER ||--o{ ARTICLE        : crea/actualiza/programa (opcional, SET NULL)
USER ||--o{ OPINION        : crea/actualiza/programa (opcional, SET NULL)
USER ||--o{ CATEGORY       : crea/actualiza (opcional, SET NULL)
USER ||--o| USERCREDENTIAL : tiene (1:1, CASCADE)
USER ||--o{ REFRESHTOKEN   : sesiona (CASCADE, token único)
USER ||--o{ MEDIAASSET     : sube (opcional, SET NULL)
USER ||--o{ NOTIFICATION   : recibe (obligatoria, CASCADE) / protagoniza como actor (opcional)
USER ||--o| NOTIFPREF      : configura (1:1, upsert)
USER ||--o{ PLANNINGITEM   : asignado/revisor/autor (opcional, SET NULL)
USER ||--o{ WEBHOOK        : crea (opcional, SET NULL)
USER ||--o{ REVISION       : firma (opcional, SET NULL)
USER ||--o{ AUDITEVENT     : ejecuta (opcional, SET NULL)

CATEGORY ||--o{ ARTICLE        : clasifica (OBLIGATORIA, RESTRICT)
CATEGORY ||--o{ PLANNINGITEM   : encuadra (opcional, SET NULL)
CATEGORY ||--|{ CATEGORY_TR    : se lee como (débil, CASCADE)

AUTHOR ||--o{ ARTICLE      : firma (opcional, SET NULL)
AUTHOR ||--|| OPINION      : firma (OBLIGATORIA, RESTRICT)
AUTHOR ||--|{ AUTHOR_TR    : se presenta como (débil, CASCADE)

ARTICLE ||--|{ ARTICLE_TR  : se lee como (débil, CASCADE, es obligatoria p/ publicar)
OPINION ||--|{ OPINION_TR  : se lee como (débil, CASCADE, es obligatoria p/ publicar)

MEDIAASSET ||--o{ ARTICLE  : ilustra (opcional, SET NULL)
MEDIAASSET ||--o{ OPINION  : ilustra (opcional, SET NULL)

ARTICLE  }o--|| REVISION   : versionado polimórfico (sin FK)
OPINION  }o--|| REVISION   : versionado polimórfico (sin FK)
CUALQUIERA }o--|| AUDITEVENT    : trazado polimórfico (sin FK)
CUALQUIERA }o--|| NOTIFICATION  : notifica sobre (sin FK)
PLANNINGITEM }o--|| ARTICLE/OPINION : materializa en (sin FK)

WEBHOOK ||--o{ WEBHOOKDELIVERY : entrega (CASCADE, idempotente)
```

Leyenda: `||--o{` = 1:N opcional del lado N · `||--||` = 1:N obligatoria · `||--o|` = 1:1 opcional · `}o--||` = referencia polimórfica sin FK.

## 5. Supuestos verificados y descartados

- ✅ "Un artículo tiene una sola categoría" — verificado (`category_id NOT NULL`, sin puente). No es supuesto: es constraint real.
- ✅ "Toda opinión tiene autor; el artículo puede no tenerlo" — verificado (asimetría `NOT NULL/RESTRICT` vs `NULL/SET NULL`).
- ✅ "Las traducciones no viven sin su padre" — verificado (`CASCADE` + PK compuesta en las 4).
- ✅ "El historial sobrevive al borrado" — verificado (Revision/AuditEvent sin FK al contenido; `remove` de artículo audita snapshot en la misma tx).
- ❌ Descartado: "existe N:M" — no hay ninguna tabla puente.
- ❌ Descartado: "los lectores son Users" — no hay registro público ni rol lector; User es solo staff.
- ❌ Descartado: "toda entidad referenciada tiene FK" — las cuatro polimórficas no la tienen.

## 6. Decisiones actuales que pueden limitar la evolución futura

### 6.1 `Article.category_id` único (N:1 rígido)

Si el negocio pidiera multi-sección por pieza (p. ej. un artículo en "Política" y "Economía"), el modelo actual lo impide: exigiría tabla puente `article_categories` + migración de datos + reescritura de lecturas públicas y del guard `ssot-guard`. El costo es medio-alto porque `category_id` está asumido en repositorios, índices parciales y `snapshotArticle`. No es fallo actual (BR-006 se cumple), pero es el punto de rigidez nº 1 — el mismo ejemplo que el apunte usa para "escalabilidad".

### 6.2 Asimetría de autoría Article (opcional) vs Opinion (obligatoria)

Correcta para el dominio (una opinión sin firma no existe; un cable puede no tenerla), pero el rediseño debe conservarla explícitamente: unificar ambas en una supertabla "Piece" con autor opcional rompería BR-007 salvo CHECK condicional por tipo.

### 6.3 Locales cerrados `es/en` y español canónico obligatorio (resuelto en M-02)

El CHECK `locale IN ('es','en')` + "es obligatoria para publicar" (BR-009/BR-010) impedía un tercer idioma sin migración. Serie física 2026-09-22: los locales son datos en la tabla `locales` con FKs (`20260920000000_locales`); agregar un idioma es un `INSERT`. La regla "es obligatoria para publicar" sigue en API (BR-010 intacta).

### 6.4 Referencias polimórficas sin FK (Revision, AuditEvent, Notification, PlanningItem)

Ventaja actual: historial desacoplado que sobrevive al borrado. Costos: sin integridad referencial declarativa, sin joins, `entity_type` como string libre (typos posibles), y búsquedas "todo sobre X" repartidas en 4 tablas. El rediseño deberá elegir: (a) mantener polimorfismo con catálogo cerrado de tipos + índices, (b) FKs concretas por tipo, o (c) tabla de eventos unificada. Decisión pendiente de la fase de modelo lógico — aquí solo se registra.

### 6.5 Contenido como JSONB opaco + `status` como texto

`content` JSONB con CHECK "array no vacío" es flexible pero opaco para SQL (búsquedas, validación de bloques). `status/type/priority/action` como `TEXT + CHECK` en vez de enums nativos impide documentar el vocabulario en el catálogo y permite valores válidos-en-DB pero desconocidos por la API. Ambos son evolucionables sin romper datos, pero conviene decidirlos antes del nuevo `schema.prisma`.

### 6.6 MediaAssets huérfanos y portadas `SET NULL`

Borrar un medio deja las piezas sin portada (tolerado) y nada impide assets sin uso (basura acumulable). Si el rediseño introduce ciclo de vida de medios (cuota, purga, auditoría de uso), hará falta contabilidad de referencias.

## 7. Salida hacia el modelo lógico

Con este conceptual cerrado, la fase siguiente (modelo lógico relacional) deberá resolver, en este orden:

1. ¿Supertabla `pieces` (Article+Opinion) o tablas hermanas? (Restricción: conservar BR-006/BR-007/BR-010/BR-012.)
2. Puente `article_categories` ahora o solo preparación (índices y lecturas listas para N:M).
3. Catálogo cerrado para `entity_type` polimórficos + estrategia de joins.
4. Enums nativos vs `TEXT + CHECK` para status/roles/locales.
5. `locales` como datos si se prevé tercer idioma.
6. Contabilidad de uso de `MediaAsset` si se quiere purga.

Nada de lo anterior se decide aquí: este documento es la base verificada sobre la que esas decisiones se tomarán.
