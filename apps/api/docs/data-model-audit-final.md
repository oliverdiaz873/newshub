# Auditoría final de consistencia — cadena BR → tests (2026-09-22)

## 1. Alcance

Comparar, sin abrir nuevas migraciones: reglas de negocio (`business-rules.md`, 22 BR) ↔ modelo conceptual (`data-model-conceptual.md`) ↔ modelo lógico (`data-model-logical.md`, D1–D6) ↔ físico real (PostgreSQL `newshub_dev`, 14 migraciones) ↔ Prisma (`schema.prisma` + Client generado) ↔ tests (`type-check` + 90 unitarios). Criterio: ninguna discrepancia documental o técnica sin registrar y corregir.

## 2. Verificación física (evidencia del día)

Inventario real obtenido por catálogo (valores verificados, no asumidos):

| Objeto | Esperado | Real | Estado |
|---|---|---|---|
| Filas `locales` | 2 (`es` default, `en`) | 2 | ✅ |
| FKs `*_locale_fk` | 4 | 4 | ✅ |
| CHECKs `entity_type`×4 + `mime` | 5 | 5 | ✅ |
| Antiguos `*_locale_check` | 0 | 0 | ✅ |
| Tabla `article_categories` (M-04) | no existe | 0 | ✅ (reservada, no creada) |
| Vista `media_orphans` | existe | 1 | ✅ |
| Índice `notifications_entity_idx` (M-05) | no existe (omitido) | 0 | ✅ |
| `migrate status` | al día, 14 migraciones | al día, 14 | ✅ |
| Conteos de negocio | 42 artículos / 6 opiniones / 7 categorías / 42 assets | intactos tras cada M | ✅ |
| `schema.prisma` ↔ DB | sin deriva | `migrate status` al día + `validate` OK | ✅ |
| Tests | 90/90 + type-check | verde al cierre de serie | ✅ |

Reglas BR re-verificadas contra el físico resultante: BR-001…BR-008 intactas (UNIQUE/FK/CHECK base sin tocar); BR-009/BR-010 soporte migrado CHECK→FK sin cambio de comportamiento API; BR-011…BR-022 sin cambios (ningún M tocó sus mecanismos). Sin pérdidas de datos (backup previo + conteos por M).

## 3. Discrepancias encontradas y corrección aplicada

Todas documentales (ninguna técnica: el físico estaba correcto en todos los puntos).

| ID | Discrepancia | Severidad | Corrección |
|---|---|---|---|
| F-01 | `business-rules.md` §3 y BR-009/BR-010 citaban `*_locale_check` como mecanismo vigente (eliminados por M-02) | media | §3, matriz BR-009/BR-010 y detalle BR-009 ahora citan FK → `locales`; nota de vigencia agregada en §2 |
| F-02 | Citas `schema.prisma:NN` desplazadas +14/+18 líneas por el modelo `Locale` (BR-002/003/004/005/006/007 y detalle 003a–d) | media | 12 citas actualizadas a líneas verificadas (:63, :82, :112, :155, :194, :200, :225, :118/:132, :119/:133/:161/:172) |
| F-03 | `data-model-conceptual.md` §3 citaba rangos pre-M-02 | baja | Rangos actualizados (:93-94, :125-136, :167-175, :204-206, :240-244, :254-259, :271-277, :298-314, :331-334) |
| F-04 | `data-model-conceptual.md` §6.3 describía el CHECK de locale como límite actual | media | Reescrito como resuelto en M-02 |
| F-05 | `data-model-physical-plan.md` numeraba §§ 4→6→7 (falta el 5) | baja | Renumerado 4→5→6; §6 refleja serie ejecutada |
| F-06 | `data-model-logical.md` §8/D5/§7/§10 hablaban de M-02/M-03/M-06 como propuestas pendientes | media | Notas de vigencia con estado real (ejecutadas M-02/M-03/M-06; omitidas M-04/M-05) |

## 4. Puntos verificados sin discrepancia

- D1–D6 del lógico siguen fieles al físico (sin supertabla, sin puente, polimorfismo con CHECKs, TEXT+CHECK, `locales` como datos, SET NULL en medios).
- Prohibiciones de la serie respetadas (sin CASCADE a piezas, sin cambios de nulabilidad/tipos, sin tocar máquinas de estado, solo seed técnico `es/en`).
- M-04/M-05 correctamente no ejecutadas/omitidas con motivo registrado.
- `backups/` ignorado por git (no contamina el árbol); `.gitignore` modificado preexistente no tocado.

## 5. Residuales (no bloquean el cierre)

- R-1: retención de `webhook_deliveries` terminales sin ventana definida (heredado de `business-rules.md` §7, "Necesita investigación").
- R-2: `docs/architecture.md` / `folder-structure.md` / `getting-started.md` siguen desactualizados respecto al monorepo real (registrado desde la auditoría BR; fuera del alcance de esta serie).
- R-3: citas `migration.sql:NN` del init se refieren al archivo original inmutable — siguen válidas.

## 6. Conclusión

Cadena consistente de extremo a extremo: 22 BR verificadas → 19 conceptos → 6 decisiones lógicas → 3 migraciones aplicadas + 2 omisiones motivadas → Prisma sin deriva → tests verdes. Discrepancias halladas: 6, todas documentales, todas corregidas en este acto. **La feature puede cerrarse.**
