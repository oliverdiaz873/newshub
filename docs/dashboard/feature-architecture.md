# Dashboard Feature-Based Architecture

> Fuente de verdad de las reglas arquitectónicas del Dashboard. Arquitectura establecida
> en `refactor/dashboard-feature-architecture` (fases F1–F11) y validada con `type-check`,
> `lint` y `build`. Todo futuro desarrollo del Dashboard debe respetar este documento.

## Target tree

```text
apps/dashboard/
├── app/                  # routing + composición (thin, sin lógica de dominio)
├── features/
│   ├── articles/         # CRUD + transiciones + validación de artículos
│   ├── opinions/         # espejo de articles para opiniones
│   ├── editorial-shared/ # transversal editorial: HistoryPanel, ScheduleSection,
│   │                     # LocaleTabs, SeoChecklist, validate-content,
│   │                     # revision-diff, schedule, transitions, types (EditorOption)
│   ├── media/            # dueño de MediaCard + MediaPicker + MediaManager;
│   │                     # expone public API mínima vía index.ts
│   ├── categories/       # catálogo + validación
│   ├── authors/          # catálogo + validación
│   ├── planning/         # tablero + formulario + state machine propia (planning.ts)
│   ├── scheduling/       # vista /scheduled (ScheduledList + useScheduled)
│   ├── overview/         # vista agregada home (OverviewBoard, sin service propio)
│   ├── analytics/        # vista agregada de métricas + analyticsService
│   ├── notifications/    # inbox + tipos + polling (notifications.ts + service)
│   ├── syndication/      # webhooks + deliveries + syndicationService
│   ├── audit/            # visor de audit-log + auditService
│   ├── auth/             # UI de login (LoginForm); la infra de sesión vive en shared/
│   └── settings/         # sesión + API + prefs + preferencias UI
├── shared/
│   ├── components/       # Shell, Sidebar, Topbar, Breadcrumbs, Table/Paginator,
│   │                     # Modal/ConfirmDialog, States, Toasts, LoadingFallback,
│   │                     # RequireAuth (solo lo genuinamente reutilizable)
│   ├── api/              # apiFetch, getApiBase, HTTP/error helpers (agnóstico)
│   └── lib/              # theme, i18n providers, ui-prefs, dirty-guard, slug
├── src/                  # app.css + messages/ (en.json, es.json); sin código legacy
└── proxy.ts              # routing hygiene (no decide autenticación)
```

Alias: `@/*` resuelve `./src/*` primero y `./*` después, de modo que
`@/features/*` y `@/shared/*` son importables. No quedan imports legacy
(`@/components`, `@/lib/`, `@/src/`, `@/lib/notifications`): cualquier aparición
futura debe eliminarse, no extenderse.

## Dependency direction

```text
app
  ↓
features
  ↓
shared
```

* `shared/*` NUNCA importa `features/*`. Regla crítica:

```text
shared → features = PROHIBIDO
```

* `feature A → feature B` solo cuando representa una relación real de dominio:
  mínima, unidireccional y justificada (ver dependencias cross-feature).
* `editorial-shared` NO importa `articles`, `opinions`, `media`, `planning`,
  `scheduling` ni ninguna otra feature.

## Feature ownership

Cada dominio funcional vive dentro de `features/<feature>`. El código utilizado
exclusivamente por una feature permanece dentro de esa feature.

No mover código a `shared` simplemente porque potencialmente podría reutilizarse
en el futuro. La reutilización debe ser real y transversal antes de extraer.

## Shared boundary

`shared/` contiene únicamente:

* infraestructura transversal (sesión, i18n, theme, providers);
* componentes UI realmente genéricos (tablas, modales, estados, toasts);
* utilities realmente agnósticas del dominio;
* capacidades utilizadas por múltiples dominios.

`shared` no contiene lógica específica de un dominio.

Regla por defecto:

> Ante la duda entre `feature` y `shared`, mantenerlo en la feature hasta que
> exista evidencia real de reutilización transversal.

Antes de mover algo a `shared`, comprobar:

```text
¿Es realmente transversal?
¿Es agnóstico del dominio?
¿Tiene reutilización real?
¿Su ownership pertenece a toda la aplicación?
```

Si alguna respuesta no es clara, se queda en la feature. Esto evita que `shared/`
se convierta en "todo lo que no sabemos dónde poner".

## Feature boundaries

Una feature no importa internals de otra feature. Evitar desde otra feature:

```text
@/features/foo/components/...
@/features/foo/hooks/...
@/features/foo/types
@/features/foo/services/...
```

cuando exista una superficie pública apropiada. Los módulos de servicio designados
como superficie pública documentada (p. ej. `listScheduledArticles`,
`listScheduledOpinions`, `listCategories`) son la excepción: ver dependencias
cross-feature. Cuando una capacidad necesite consumo externo, exponer una API
pública mínima y explícita. Ejemplo actual:

```text
@/features/media
```

mediante:

```text
features/media/index.ts
```

que exporta solo `MediaPicker` + `MediaOption` (consumido por ambos editores).
No crear barrels masivos que expongan internals innecesarios: exportar solo lo
que ya se consume fuera.

## Cross-feature dependencies

Una dependencia entre features no es automáticamente un problema. Cada una debe
poder explicar:

```text
¿Por qué A necesita B?
¿Qué parte de B consume?
¿La superficie pública es mínima?
¿La dependencia es unidireccional?
¿Puede crear un ciclo?
¿Seguirá teniendo sentido si B evoluciona?
```

Dependencias existentes y justificadas (referencia arquitectónica, acíclicas):

```text
articles → editorial-shared
opinions → editorial-shared

articles → media (solo picker público)
opinions → media (solo picker público)

scheduling → articles (solo listScheduledArticles)
scheduling → opinions (solo listScheduledOpinions)

planning → categories (solo lectura: listCategories)

overview → editorial-shared (solo helpers de fecha)
analytics → editorial-shared (solo helpers de fecha)
syndication → editorial-shared (solo helpers de fecha)

settings → notifications (solo constantes de lectura:
NOTIFICATION_TYPES, typeLabelKey)
```

Las relaciones de F10 son intencionales y acíclicas (p. ej. `notifications` no
importa nada de `settings`). Esta lista documenta decisiones tomadas, **no** es
una lista para copiar automáticamente en futuras features: cada edge nuevo debe
justificarse con el checklist anterior. No prohibir todas las dependencias;
evitar las accidentales creadas por comodidad.

## Routes

`app/` se encarga principalmente de routing, composición, guards, providers y
wiring. Las rutas no contienen lógica de dominio que pertenezca a una feature.
Regla general:

```text
route → feature
```

Excepciones justificadas existentes: `/articles/new` y `/opinions/new` (guard de
rol + breadcrumbs + wiring del editor: composición de routing, sin lógica de
dominio), `layout.tsx` (providers), `dashboard-shell.tsx` (composition root).

## Composition root

`app/dashboard-shell.tsx` funciona como composition root. La capa `app` puede
conectar features con componentes shared cuando la composición lo requiera:

```text
dashboard-shell
    ↓
notifications (useUnreadCount)
    ↓
unreadCount (prop plano)
    ↓
Shell / Sidebar
```

Esto permite que `shared/Sidebar` permanezca independiente de las features.
Regla futura:

> Si el composition root empieza a acumular datos de muchas features, revisar su
> crecimiento y mantener bridges por concern, evitando convertirlo en un god
> component o un contenedor de lógica de dominio.

## Services

Los servicios de features son wrappers delgados sobre `apiFetch`:

```text
UI / Hook
    ↓
feature service
    ↓
apiFetch
```

Cada función construye URL/método/body de su feature y devuelve el `Response`
crudo; el manejo de errores y el tipado de respuesta quedan en el call site.
Única excepción documentada: `listPlanningStaff` (ver apéndice).
Los servicios no almacenan UI state, lógica de presentación, componentes,
estado de formularios ni paginación de UI. Prohibidos Repository/Adapter/
Facade/DI/enterprise patterns.

No aplicar "one service per feature" mecánicamente: `overview`, `auth` y
`settings` no tienen service porque no tienen endpoints propios (overview
agrega vía `apiFetch` directo, auth usa la infra `login()`, settings hace
llamadas puntuales inline). Una abstracción service debe existir por endpoints
propios, no por simetría de carpetas.

## Hooks

Los hooks permanecen cerca del dominio que poseen, con una responsabilidad
clara. Evitar hooks que acumulen estado de múltiples dominios, lógica de varias
features o responsabilidades no relacionadas. Un hook compartido (`shared/` o
`editorial-shared`) debe ser realmente transversal. Referencias actuales:
`useScheduled` (vista de programados), `useUnreadCount` (badge best-effort),
`useDirtyGuard`, `useUiPrefs`, `useSidebarCollapsed`.

## Component organization

La estructura interna de una feature evoluciona según su complejidad real. No
aplicar `folder-per-component` obligatoriamente. Una estructura flat es válida:

```text
components/
├── ArticleList.tsx
├── ArticleDetail.tsx
├── ArticleEditor.tsx
```

Si un componente adquiere múltiples archivos relacionados o responsabilidades
claramente separables, puede evolucionar a:

```text
ArticleEditor/
├── ArticleEditor.tsx
├── ContentSection.tsx
├── SeoSection.tsx
├── ...
```

La división se hace por responsabilidad, no por cantidad de líneas.

Cuando una feature crezca, `components/ services/ types.ts validate.ts` puede
evolucionar naturalmente hacia `components/ hooks/ services/ types/ lib/`, si
la complejidad real lo justifica. No anticipar estructuras innecesarias.

## Avoid over-abstraction

No introducir patrones o capas para que la arquitectura parezca más
sofisticada. No agregar automáticamente Repository, Adapter, Facade, Dependency
Injection, nuevos state managers (React Context + local state es la decisión
vigente), nuevas capas, nuevos barrels ni abstracciones genéricas. Una
abstracción debe existir porque resuelve un problema real de mantenimiento,
reutilización o acoplamiento.

## Scalability principle

Incorporar una funcionalidad nueva debería afectar principalmente
`features/<new-feature>` o una feature existente relacionada, evitando cambios
simultáneos en múltiples dominios no relacionados. La arquitectura favorece
cambios localizados y ownership claro.

## Architectural review triggers

Señales que justificarían revisar la arquitectura:

* aparición de ciclos;
* `shared` acumulando lógica de dominio;
* aumento significativo de dependencias feature → feature;
* deep imports entre features;
* servicios que dejan de ser thin;
* hooks que manejan múltiples dominios;
* `dashboard-shell.tsx` acumulando demasiados bridges;
* `editorial-shared` incorporando semántica que ya no pertenece únicamente al
  dominio editorial;
* features que se convierten en mini-monolitos.

Una señal no implica automáticamente un refactor: primero se analiza el
problema real.

## Final principle

> La arquitectura evoluciona según la complejidad real del producto. No se
> reorganiza código, ni se introducen abstracciones o nuevas capas, por
> anticipar problemas hipotéticos.

## Appendix: history and known debt

Migración F1–F11 completada en `refactor/dashboard-feature-architecture`
(Foundation → Shared → Editorial-shared → Articles → Opinions → Media →
Categories+Authors → Planning → Scheduling → dominios restantes → cleanup).

Deuda conocida y deliberada: `planning` deriva el roster de staff desde
`GET /audit-log` (`listPlanningStaff` en `planningService.ts`) porque no existe
endpoint de usuarios; la API valida ids server-side. Si la API expone endpoint
de usuarios, reemplazar solo esa implementación. El boundary planning ↛ audit
como feature debe preservarse.

## Quality gates

Desde `apps/dashboard` ante cualquier cambio: `npm run type-check`,
`npm run lint`, `npm run build`. E2E relevante desde `apps/e2e`. Antes de cada
commit: `git status`, `git diff --stat`, `git diff`. No commitear
`apps/dashboard/next-env.d.ts` ni `apps/storefront/next-env.d.ts`
pre-existentes. i18n: se mantienen `src/messages/en.json`, `es.json`; sin
migración amplia.
