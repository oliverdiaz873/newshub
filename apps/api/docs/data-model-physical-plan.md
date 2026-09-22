# Plan de implementación física — Newshub (M-01…M-06)

## 1. Posición y regla de oro

```
Reglas (22 BR) ✅ → Conceptual ✅ → Lógico ✅ APROBADO
  → PLAN FÍSICO ⬅ ESTE DOCUMENTO (sin ejecutar nada)
  → (con aprobación separada) Migraciones numeradas → schema.prisma → datos → validación
```

**Regla de oro de cada M**: `BR → modelo lógico → migración → constraint/índice → datos existentes → validación`. Antes de ejecutar cualquier migración, el agente verificará, en este orden, que: no se pierden datos; no se rompe ninguna BR-001…BR-022; no se introduce ningún CASCADE hacia piezas editoriales; no se crea `article_categories`; no se convierte ninguna decisión futura en funcionalidad actual; el código existente sigue compatible hasta validar la migración.

Estado: plan aprobado para revisar. **Ningún M está ejecutado.** Los bocetos SQL de este documento son propuestas sujetas a la aprobación de implementación, no migraciones.

## 2. Estrategia global de compatibilidad y datos existentes

1. **Aditivo primero**: cada M solo `CREATE`/`ADD`/`INSERT`. Ningún `DROP`, `ALTER COLUMN TYPE` destructivo ni cambio de nulabilidad hacia `NOT NULL` sin backfill previo en esta serie (ningún M lo requiere).
2. **Verificación pre-vuelo obligatoria**: cada M incluye consultas `SELECT` de violación que deben devolver 0 filas antes del `ALTER`. Si devuelven >0, el M se detiene y se reporta; no se "limpian" datos para que pase el constraint.
3. **Ventana de compatibilidad**: el código actual (servicios, repositorios, Prisma Client) debe seguir funcionando tras cada M sin cambios. Por eso M-02/M-03 solo agregan objetos que el código ignora o que validan datos que el código ya produce.
4. **Orden estricto**: M-01 → M-02 → M-03 → M-05 → M-06. M-04 explícitamente **no se ejecuta** (ver §4).
5. **Rollback**: cada M es reversible con `DROP` del objeto agregado (`DROP TABLE locales` solo si ninguna FK la referencia aún a nivel código — en M-02 las FK sí se crean; el rollback es eliminar FKs y tabla en orden inverso; ver ficha).
6. **Trazabilidad verificable**: cada M cita BRs, sección del lógico (§D) y deja su validación en `§8` de este plan como checklist ejecutable.

## 3. Fichas M

### M-01 — Documentos aprobados (completado, sin DDL)

- Contenido: `business-rules.md`, `data-model-conceptual.md`, `data-model-logical.md` + este plan.
- Validación: los tres docs existen y `git diff --check` limpio. Sin cambios de código/schema/datos.

### M-02 — Tabla `locales` + FKs + retiro de CHECKs de locale (D5)

- Objetivo: los idiomas pasan de constraint a datos; agregar un idioma futuro = `INSERT`.
- Pre-vuelo (deben devolver 0):
  ```sql
  SELECT DISTINCT locale FROM author_translations WHERE locale NOT IN ('es','en');
  SELECT DISTINCT locale FROM category_translations WHERE locale NOT IN ('es','en');
  SELECT DISTINCT locale FROM article_translations WHERE locale NOT IN ('es','en');
  SELECT DISTINCT locale FROM opinion_translations WHERE locale NOT IN ('es','en');
  ```
- DDL propuesto:
  ```sql
  CREATE TABLE locales (
    code TEXT PRIMARY KEY CHECK (code ~ '^[a-z]{2}$'),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  };
  INSERT INTO locales (code, is_default) VALUES ('es', true), ('en', false);
  CREATE UNIQUE INDEX locales_single_default ON locales (is_default) WHERE is_default;
  ALTER TABLE author_translations   ADD CONSTRAINT author_translations_locale_fk   FOREIGN KEY (locale) REFERENCES locales(code) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE category_translations ADD CONSTRAINT category_translations_locale_fk FOREIGN KEY (locale) REFERENCES locales(code) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE article_translations  ADD CONSTRAINT article_translations_locale_fk  FOREIGN KEY (locale) REFERENCES locales(code) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE opinion_translations  ADD CONSTRAINT opinion_translations_locale_fk  FOREIGN KEY (locale) REFERENCES locales(code) ON UPDATE CASCADE ON DELETE RESTRICT;
  ALTER TABLE author_translations   DROP CONSTRAINT author_translations_locale_check;
  ALTER TABLE category_translations DROP CONSTRAINT category_translations_locale_check;
  ALTER TABLE article_translations  DROP CONSTRAINT article_translations_locale_check;
  ALTER TABLE opinion_translations  DROP CONSTRAINT opinion_translations_locale_check;
  ```
- Prisma (reflejo, en fase de implementación): modelo `Locale` + relaciones desde las 4 traducciones; `client generate`.
- Compatibilidad: el código escribe `'es'/'en'` como siempre; las FK validan exactamente esos valores (pre-vuelo lo garantiza). BR-010 sin cambios (sigue exigiendo `es` en API). `ON DELETE RESTRICT` impide borrar un idioma en uso — sin CASCADE hacia traducciones.
- BR afectadas: BR-009 (soporte), BR-010, BR-003 (variantes intactas).
- Rollback: `DROP CONSTRAINT` las 4 FK → `DROP TABLE locales`.
- Validación: re-ejecutar pre-vuelo (0 filas), `\d locales`, insert de prueba con locale inválido rechazado y revertido en tx, `prisma validate`, suite unitaria de API (no la suite completa e2e).

### M-03 — CHECKs `entity_type` + CHECK `mime` (D3/D4)

- Objetivo: cerrar los strings libres polimórficos y el mime de medios.
- Pre-vuelo:
  ```sql
  SELECT DISTINCT entity_type FROM revisions WHERE entity_type NOT IN ('article','opinion');
  SELECT DISTINCT entity_type FROM audit_events WHERE entity_type NOT IN ('article','opinion','category','author','media','user','planning','webhook','notification');
  SELECT DISTINCT entity_type FROM notifications WHERE entity_type NOT IN ('article','opinion','category','author','media','user','planning','webhook','notification');
  SELECT DISTINCT entity_type FROM planning_items WHERE entityType IS NOT NULL AND entity_type NOT IN ('article','opinion');
  SELECT DISTINCT mime FROM media_assets WHERE mime NOT IN ('image/jpeg','image/png','image/webp','image/avif');
  ```
  Nota: si alguna devuelve >0, el M se detiene y se eleva a decisión (ampliar catálogo o limpiar dato con auditoría, nunca silenciosamente).
- DDL propuesto:
  ```sql
  ALTER TABLE revisions ADD CONSTRAINT revisions_entity_type_check CHECK (entity_type IN ('article','opinion'));
  ALTER TABLE audit_events ADD CONSTRAINT audit_events_entity_type_check CHECK (entity_type IN ('article','opinion','category','author','media','user','planning','webhook','notification'));
  ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check CHECK (entity_type IN ('article','opinion','category','author','media','user','planning','webhook','notification'));
  ALTER TABLE planning_items ADD CONSTRAINT planning_items_entity_type_check CHECK (entity_type IN ('article','opinion'));
  ALTER TABLE media_assets ADD CONSTRAINT media_assets_mime_check CHECK (mime IN ('image/jpeg','image/png','image/webp','image/avif'));
  ```
- Compatibilidad: el código ya solo emite esos valores (verificado en servicios); los CHECK solo prohíben lo que el código nunca produce. Sin cambios de API.
- BR: BR-016/018/019/014 (gobernanza), BR-004 (medios).
- Rollback: `DROP CONSTRAINT` por tabla.
- Validación: pre-vuelo en 0, inserto inválido rechazado (tx revertida), tests de historial/notificaciones.

### M-04 — Puente `article_categories`: NO EJECUTAR (D2, readiness)

- Estado: **explícitamente fuera de esta serie.** El diseño está reservado en el lógico §3 D2.
- Criterios de activación (todos deben cumplirse para proponerlo): requisito de negocio de multi-sección firmado; inventario de lecturas por `category_id` (repositorios + índices parciales + snapshots); plan de backfill `category_id → puente` con verificación fila a fila; estrategia de compatibilidad de lecturas (`COALESCE`). Hasta entonces, ni siquiera se crea la tabla: un N:M prematuro violaría la condición "no convertir decisiones futuras en funcionalidad actual".

### M-05 — Índice `(entity_type, entity_id)` en `notifications` (condicional, D3)

- Objetivo: simetría con `revisions`/`audit_events` para "todo sobre X".
- Condición: ejecutar solo si el perfil de lectura lo pide (consultas por entidad en bandeja) o si el `EXPLAIN` muestra seq-scan. Si no, se registra como omitido con motivo.
- DDL propuesto: `CREATE INDEX notifications_entity_idx ON notifications(entity_type, entity_id);`
- Compatibilidad total (índice nuevo, invisible al código). Rollback: `DROP INDEX`.

### M-06 — Observabilidad de medios: vista `media_orphans` (D6)

- Objetivo: hacer visible la basura potencial sin borrar nada.
- DDL propuesto (solo lectura):
  ```sql
  CREATE VIEW media_orphans AS
  SELECT m.* FROM media_assets m
  WHERE NOT EXISTS (SELECT 1 FROM articles a WHERE a.cover_media_id = m.id)
    AND NOT EXISTS (SELECT 1 FROM opinions o WHERE o.cover_media_id = m.id);
  ```
- La purga queda fuera de esta serie: será manual, auditada (`audit_events action='media.purge'`), con ventana de retención por definir (punto "Necesita investigación" heredado). Ningún `DELETE` automatizado, ningún CASCADE hacia piezas.
- Prisma: la vista no se mapea como modelo gestionado (solo lectura vía `$queryRaw` si se necesita).
- Validación: `SELECT count(*) FROM media_orphans` funciona;_datos intactos (conteo de `media_assets` invariante).

## 4. Prohibiciones explícitas de la serie (condición de aprobación)

1. No crear `article_categories` (M-04 fuera de alcance).
2. No agregar CASCADE hacia `articles/opinions/categories/authors` desde ningún objeto nuevo.
3. No cambiar nulabilidad ni tipos de columnas existentes.
4. No tocar `status/type/priority/action/role` (permanecen TEXT+CHECK, D4).
5. No alterar lógica de `resolveTransition`, `publishDue`, `restore`, guards ni fan-outs.
6. No sembrar ni borrar datos de negocio; solo seed técnico `locales (es,en)`.

## 5. Registro de ejecución (serie 2026-09-22, DB `newshub_dev`)

- M-01: completado (documentos). Sin DDL.
- M-02 `20260920000000_locales`: aplicado. Pre-vuelo 0 filas; backup previo OK; post-verificado (tabla `locales` es/en, 4 FKs `RESTRICT/UPDATE CASCADE`, CHECKs viejos retirados, conteos 84/6/14/1 intactos, borrado de `es` rechazado). `schema.prisma` refleja la realidad (modelo `Locale` + 4 relaciones); `prisma validate/generate` OK; `migrate status` al día; `type-check` OK; 90 tests unitarios OK.
- M-03 `20260920000001_catalog-checks`: aplicado. Pre-vuelo 0 filas; 5 CHECKs verificados + rechazo negativo probado (`spaceship`, `video/mp4`); conteos intactos; sin reflejo Prisma posible (CHECKs solo SQL, patrón documentado); tests de historial/scheduling/transiciones OK.
- M-04: **NO ejecutado** (verificado: `article_categories` no existe). Criterios de activación pendientes.
- M-05: **omitido con motivo** (EXPLAIN muestra seq scan sobre `notifications` vacía — 0 filas; sin perfil de lectura que lo exija).
- M-06 `20260920000002_media-orphans`: aplicado. Vista operativa (`media_orphans`=0, `media_assets`=42 intactos). Sin purga.
- Cierre: `type-check` + suite unitaria completa + `migrate status` al día + `git diff --check` limpio. Sin commit/push/PR.

## 6. Orden de ejecución y validación final (aplicado en la serie 2026-09-22)

Por cada M ejecutado, en orden: pre-vuelo → DDL en transacción → validación de la ficha → `prisma db pull`/ajuste de schema como reflejo → `prisma validate + generate` → tests unitarios del módulo afectado → checklist §8 firmado en el mensaje de reporte. Cierre de serie: `git status` (solo migraciones + `schema.prisma` + docs tocados por el build), `git diff --check`, re-verificación BR-001…BR-022 contra el físico resultante, sin commit/push/PR salvo orden expresa.
