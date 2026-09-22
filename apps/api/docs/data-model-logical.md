# Modelo lógico relacional — Newshub

## 1. Posición en la secuencia

```
Reglas de negocio (22 BR) ✅ → Modelo conceptual (19 conceptos, 0 N:M) ✅
  → MODELO LÓGICO ⬅ ESTE DOCUMENTO
  → (después, con aprobación) Prisma schema → Migraciones → Validación
```

Base: `data-model-conceptual.md` §3–§6 y `business-rules.md` BR-001…BR-022. Este documento convierte las 6 decisiones pendientes en decisiones técnicas explícitas y especifica tablas, claves, constraints e índices del modelo objetivo. **No ejecuta nada**: no crea ni modifica `schema.prisma`, migraciones, código ni datos. Los cambios físicos numerados `M-01…` quedan propuestos y ordenados para la fase de implementación, que requerirá aprobación separada.

## 2. Principios del modelo lógico

1. **Toda BR tiene un mecanismo físico nombrado.** Si una regla vive solo en API, el modelo lógico lo declara (no finge constraints inexistentes).
2. **Supervivencia histórica > integridad declarativa** donde el conceptual lo exige (Revision/AuditEvent): sin FK al contenido, con catálogo cerrado de tipos.
3. **Integridad declarativa donde protege invariantes** (unicidad, obligatoriedad, borrado crítico): UNIQUE, NOT NULL, FK con acción explícita, CHECK solo para invariantes expresables.
4. **Cero tiempo de inactividad**: cada cambio físico es aditivo primero, backfill, conmutación, y solo después eliminación — nunca `DROP` antes de migrar datos.
5. **Prisma como consumidor, no como diseñador**: el modelo se diseña en PostgreSQL; Prisma lo refleja (TEXT+CHECK en vez de enums nativos, UUID generados en cliente, sin `pgcrypto`).

## 3. Decisiones técnicas (las 6 del conceptual)

### D1 — Supertabla `pieces`: NO

**Decisión: mantener `articles` y `opinions` como tablas hermanas.**

Fundamento: sus reglas difieren justo donde una supertabla las fundiría — artículo exige categoría y admite autor nulo (BR-006/BR-007), opinión exige autor y no tiene categoría; el contenido obligatorio en español y las máquinas de estado son simétricas pero no idénticas en servicios. Unificar obligaría a CHECKs condicionales por tipo (`category_id NOT NULL WHEN type='article'`) que son más frágiles que dos tablas claras, y a reescribir repositorios, índices parciales y snapshots. Se reabre solo si aparece un tercer tipo de pieza con el mismo workflow.

### D2 — Relación artículo ↔ categorías: N:1 físico hoy, puente diseñado y reservado

**Decisión: conservar `articles.category_id` (BR-006) y dejar especificada la tabla puente para activarla sin rediseño cuando el negocio pida multi-sección.**

Diseño reservado (no creado en esta fase):

```sql
CREATE TABLE article_categories (
  article_id  UUID NOT NULL REFERENCES articles(id)   ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  position    SMALLINT NOT NULL DEFAULT 0 CHECK (position >= 0),
  CONSTRAINT article_categories_pkey PRIMARY KEY (article_id, category_id),
  CONSTRAINT article_categories_position_unique UNIQUE (article_id, position)
);
```

Ruta de activación futura (propuesta M-04): crear puente → backfill desde `category_id` → lecturas con `COALESCE(puente, category_id)` → solo entonces eliminar la columna. Las lecturas públicas ya filtran por `category_id`; el cambio será compatible hacia atrás. No se crea ninguna tabla puente para el resto del modelo: el conceptual demostró que no hay ningún otro N:M real.

### D3 — Referencias polimórficas: se mantienen, con catálogo cerrado e índices

**Decisión: no eliminar el polimorfismo; gobernarlo.**

- Catálogo cerrado donde hoy hay string libre: `CHECK (entity_type IN ('article','opinion'))` en `revisions`; `CHECK (entity_type IN ('article','opinion','category','author','media','user','planning','webhook','notification'))` en `audit_events`, `notifications` y `planning_items`. La lista vive en este documento como fuente y en un único módulo compartido de API (ya existe el patrón: `common/transitions.ts`).
- Sin FK al contenido en `revisions/audit_events/notifications/planning_items.entity_id`: la supervivencia histórica (BR-016/BR-018) lo exige — el historial debe sobrevivir al borrado de la pieza.
- Donde sí hay integridad real se conserva: `webhook_deliveries.subscription_id → webhooks CASCADE` (BR-020), `notifications.user_id → users CASCADE` (BR-019).
- Índices compuestos para el acceso "todo sobre X": `revisions(entity_type, entity_id, version DESC)` (ya existe), `audit_events(entity_type, entity_id, at DESC)` (ya existe); agregar el mismo patrón a `notifications(entity_type, entity_id)` si las lecturas lo piden (propuesta M-05).
- Validación del `entity_id` huérfano: responsabilidad de API en escritura (convención ya vigente), no de la DB.

### D4 — Vocabularios: TEXT + CHECK (no enums nativos)

**Decisión: mantener `TEXT + CHECK` y documentar cada catálogo en §5.**

Fundamento: los enums nativos de PostgreSQL complican a Prisma (migraciones de valores con `ALTER TYPE … ADD VALUE` fuera de transacción, klienta regenerado, riesgo de bloqueo) mientras que los CHECK se versionan como cualquier migración y admiten mensajes de error claros. El costo (valores válidos-en-DB desconocidos por la API) se mitiga con el catálogo único de este documento + constantes ya existentes en código (`transitions.ts`, `planning-transitions.ts`, `NOTIFICATION_TYPES`). Se reevalúa si algún vocabulario supera ~2 cambios/año o necesita metadata por valor (entonces pasa a tabla catálogo, como D5).

### D5 — Locales como datos: SÍ (tabla `locales`)

**Decisión: crear `locales(code TEXT PK, is_default BOOLEAN, created_at)` con seed `es` (default) + `en`, y convertir las 4 columnas `translations.locale` en FK hacia ella.**

Fundamento: el CHECK `locale IN ('es','en')` (BR-009) bloquea hoy un tercer idioma con una migración de constraint; como tabla, agregar un idioma es un `INSERT` + seed de traducciones, y el backfill es trivial (2 valores existentes). La regla "español canónico obligatorio para publicar" (BR-010) no cambia: sigue en API, leyendo `is_default` en vez de una constante. Orden físico (ejecutado como M-02 en la serie 2026-09-22): crear tabla + seed → agregar FKs (validan lo existente) → eliminar los 4 CHECKs de locale → API lee default de DB con fallback `es`.

### D6 — Ciclo de vida de medios: contabilidad sin borrado en cascada

**Decisión: mantener `SET NULL` en portadas; agregar observabilidad y purga gobernada, nunca `CASCADE` desde medios hacia piezas.**

- Borrar un medio deja piezas sin portada (tolerado, BR-021). Un `CASCADE` inverso destruiría contenido editorial: prohibido.
- Propuesta M-06: vista `media_orphans` (assets sin referencia en `articles.cover_media_id` ni `opinions.cover_media_id`) + reporte periódico; purga solo manual/auditada con `audit_events(action='media.purge')`. La ventana de retención queda como el punto "Necesita investigación" ya registrado en `business-rules.md` §7.

## 4. Especificación lógica por tabla

Convenciones heredadas del físico actual y conservadas: PK UUID (generación en cliente), `snake_case`, `timestamptz` con default `now()`, traducciones con PK compuesta, JSONB para `content/snapshot/payload/metadata`, arrays `text[]` para `events/muted_types`. Extensión `unaccent` instalada (búsqueda sin tildes; sin índices de expresión hasta que la escala lo pida — ver migración `20260911000000_unaccent`).

| Tabla | PK | FKs (acción) | UNIQUE / NOT NULL clave | CHECKs | Índices |
|---|---|---|---|---|---|
| `users` | `id` | — | `UNIQUE email`; `display_name, role NOT NULL` | `role IN (admin,editor,reviewer)` | `users_email_key` |
| `user_credentials` | `user_id` | `→ users CASCADE` | PK compartida 1:1 | — | — |
| `refresh_tokens` | `id` | `→ users CASCADE` | `UNIQUE token_hash`; `user_id, expires_at NOT NULL` | — | `(user_id)` |
| `locales` (nueva, M-02) | `code` | — | `code` seed `es,en`; `is_default` un solo `true` (índice parcial único) | `code ~ '^[a-z]{2}$'` | único parcial en `is_default WHERE true` |
| `authors` | `id` | — | `UNIQUE slug` | `slug ~ '^[a-z0-9-]{3,120}$'` | `authors_slug_key` |
| `author_translations` | `(author_id, locale)` | `→ authors CASCADE`; `locale → locales RESTRICT` | `UNIQUE (locale,name)` | formato slug donde aplique | `(locale,name)` único |
| `categories` | `id` | `created_by/updated_by → users SET NULL` | `sort NOT NULL DEFAULT 0` | — | — |
| `category_translations` | `(category_id, locale)` | `→ categories CASCADE`; `locale → locales RESTRICT` | `UNIQUE (locale,slug)` | slug formato | `(locale,slug)` único |
| `articles` | `id` | `category_id → categories RESTRICT` (BR-006); `author_id → authors SET NULL`; `cover_media_id → media_assets SET NULL`; actores `→ users SET NULL` | `category_id, status NOT NULL` | `status`, `published_at` coherente (BR-008), `scheduled` solo informativo | parciales publicado/programado/curado; `(author_id)` |
| `article_translations` | `(article_id, locale)` | `→ articles CASCADE`; `locale → locales RESTRICT` | `UNIQUE (locale,slug)`; `title, summary, content NOT NULL` | slug formato; `content` array no vacío (BR-011) | `(locale,slug)` único |
| `opinions`, `opinion_translations` | idem | `author_id → authors RESTRICT` (BR-007); resto idem artículos | idem | idem | idem |
| `article_categories` (reservada, §3 D2) | `(article_id, category_id)` | `article → articles CASCADE`; `category → categories RESTRICT` | `UNIQUE (article_id, position)` | `position >= 0` | `(category_id, article_id)` |
| `media_assets` | `id` | `created_by → users SET NULL` | `UNIQUE storage_key`; `mime NOT NULL` | `mime IN (image/jpeg,image/png,image/webp,image/avif)` (nuevo, M-06; hoy solo convención en `media.service.ts`) | `storage_key` único |
| `revisions` | `id` | `actor_id → users SET NULL`; **sin FK al contenido** (D3) | `UNIQUE (entity_type,entity_id,version)` | `entity_type IN (article,opinion)` (nuevo, M-03) | `(entity_type,entity_id,version DESC)` |
| `audit_events` | `id` | `actor_id → users SET NULL`; **sin FK al contenido** (D3) | `at NOT NULL DEFAULT now()` | `entity_type IN (…9 valores…)` (nuevo, M-03) | `(at DESC)`, `(entity_type,entity_id,at DESC)` |
| `notifications` | `id` | `user_id → users CASCADE`; `actor_id → users SET NULL`; **sin FK al contenido** (D3) | `user_id, type, entity_type NOT NULL` | `entity_type IN (…)` (nuevo, M-03); `type` contra `NOTIFICATION_TYPES` solo en API | `(user_id,created_at DESC)`, `(user_id,readAt)` |
| `notification_prefs` | `user_id` | `→ users CASCADE` | PK compartida 1:1; `muted_types NOT NULL DEFAULT '{}'` | — (límite 20 en API, BR-022) | — |
| `planning_items` | `id` | `category/assignee/reviewer/createdBy/updatedBy → SET NULL`; **enlace a pieza sin FK** (D3) | `type, title, priority, status NOT NULL` | `type/priority/status` + `entity_type IN (…)` (M-03) | `(assignee,status,due)`, `(status,due)`, `(due)`, `(reviewer)`, `(category)`, `(type)` |
| `webhooks` | `id` | `created_by → users SET NULL` | `url, secret_hash, events NOT NULL` | — | — |
| `webhook_deliveries` | `id` | `subscription_id → webhooks CASCADE` (integridad real, D3) | `UNIQUE (subscription,entity,action)` | `status IN (pending,inflight,delivered,failed)`, `action IN (published,unpublished)` | `(status,nextAttemptAt)`, `(subscription,created DESC)` |

## 5. Catálogos de valores (fuente única)

| Catálogo | Valores | Hoy | Destino |
|---|---|---|---|
| `role` | `admin, editor, reviewer` | CHECK | CHECK (D4) |
| `article/opinion status` | `draft, review, published, archived` | CHECK + máquinas API | CHECK + `transitions.ts` (D4) |
| `planning type/priority/status` | `pitch,assignment` / `low,normal,high` / `pitched,assigned,in-progress,in-review,done,cancelled` | CHECK + `planning-transitions.ts` | igual (D4) |
| `webhook status/action` | `pending,inflight,delivered,failed` / `published,unpublished` | CHECK | igual (D4) |
| `locale` | `es (default), en` | 4× CHECK | **tabla `locales` + FK** (D5) |
| `entity_type` polimórfico | `article, opinion` (revisiones); 9 valores (auditoría/notif./planning) | string libre | CHECK cerrado (D3/M-03) |
| `notification type` | 11 valores `NOTIFICATION_TYPES` | solo API | solo API (volátil, no CHECK) |
| `mime` medios | `image/jpeg,png,webp,avif` | solo API (`media.service.ts`) | CHECK (M-06) |

## 6. Normalización y denormalizaciones intencionales

- **Normalizado (3FN)**: entidades fuertes, traducciones como entidades débiles con PK compuesta (sin redundancia de `title/slug` fuera de su idioma), credenciales/prefs en 1:1 (evitan nulos y separan ciclo de vida), deliveries con PK propia + UNIQUE de negocio.
- **Denormalizado a conciencia** (se conserva, documentado):
  - `content/snapshot/payload/metadata` JSONB: el contenido editorial y las fotos históricas son documentos; normalizarlos en bloques relacionales aportaría joins sin consultas que los pidan.
  - `muted_types text[]`, `events text[]`: conjuntos pequeños, con límite API, sin consultas de join.
  - `firstPublishedAt` derivado (`publishedAt` conservado, BR-008) y contadores por consulta (no columnas).
- **Deuda aceptada**: `entity_id UUID` sin FK (D3) y `content` opaco para SQL (§6.5 del conceptual). Ambas quedan registradas, no ocultas.

## 7. Índices y rendimiento (qué se conserva, qué se agrega)

- Se conservan todos los existentes: UNIQUEs de negocio, parciales de lectura pública (`status=published`), parciales de scheduling, curaduría breaking/featured, bandeja y auditoría (inventario en `business-rules.md` §3).
- Agregados en la serie 2026-09-22: CHECKs de `entity_type` (M-03) e índice único parcial `locales(is_default) WHERE true` (M-02). M-05 (índice en `notifications`) omitida con motivo: tabla vacía sin perfil de lectura que lo exija.
- `unaccent()`: sin índices de expresión (es `STABLE`, requeriría wrapper `IMMUTABLE`; diferido hasta escala de catálogo, según la propia migración).
- Sin `pg_trgm`, sin particionado, sin réplicas en el modelo: la escala actual no los justifica; el diseño no los impide.

## 8. Evolución y migraciones propuestas (ordenadas; estado de ejecución en `data-model-physical-plan.md` §5)

> Nota de vigencia (serie física 2026-09-22): ejecutadas M-02 (`20260920000000_locales`), M-03 (`20260920000001_catalog-checks`) y M-06 (`20260920000002_media-orphans`); M-04 explícitamente no ejecutada; M-05 omitida con motivo documentado.

| ID | Cambio | Tipo | Riesgo |
|---|---|---|---|
| M-01 | Documentos aprobados (`business-rules`, `conceptual`, este lógico) | solo docs | nulo |
| M-02 | Tabla `locales` + seed + FKs + retirar 4 CHECKs de locale | aditiva + backfill trivial | bajo |
| M-03 | CHECKs `entity_type` + CHECK `mime` medios | aditiva (validan datos existentes; verificar antes) | bajo |
| M-04 | Puente `article_categories` (SOLO cuando el negocio pida multi-sección) | aditiva + backfill + conmutación | medio (toca lecturas) |
| M-05 | Índice `(entity_type,entity_id)` en `notifications` si el perfil lo pide | aditiva | bajo |
| M-06 | Vista `media_orphans` + política de purga auditada | aditiva | bajo |

Cada M llevará su migración numerada, verificación de datos preexistentes (`SELECT` de violación antes del `ALTER`), y actualización de `schema.prisma` como reflejo — nunca al revés.

## 9. Trazabilidad BR → modelo lógico

BR-001/002/003/004/005 → UNIQUEs §4 · BR-006/007 → FK obligatorias §4 · BR-008 → CHECK + API · BR-009 → catálogos §5 (D4/D5) · BR-010 → API + FK locales · BR-011 → CHECKs · BR-012 → API (CHECK solo vocabulario) · BR-013 → API + índices parciales · BR-014 → CHECKs + API · BR-015 → API + CHECK rol · BR-016/017/018 → UNIQUE + append-only + D3 · BR-019 → FKs + D3 · BR-020 → UNIQUE + FK real + claim · BR-021 → matriz de acciones FK §4 · BR-022 → API.

## 10. Conclusión y pedido de aprobación

El modelo lógico conserva lo que funciona (hermanas Article/Opinion, 1:N ÚNICO con puente reservado, TEXT+CHECK, historial sin FK), gobierna lo libre (catálogo `entity_type`, tabla `locales`, CHECK `mime`) y da ciclo de vida a medios sin riesgo de borrado. Estado tras la serie física 2026-09-22: decisiones D1–D6 implementadas en lo aprobado (M-02/M-03/M-06) u omitidas con motivo (M-04/M-05); el detalle de ejecución vive en `data-model-physical-plan.md` §5.
