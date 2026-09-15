# Dashboard Feature-Based Architecture — Dependency Rules (Fase 1)

> Fundación creada en `refactor/dashboard-feature-architecture`. Sin migración de código todavía.
> `app/` + `src/components/` + `src/lib/` siguen siendo la implementación activa.
> `features/` y `shared/` son la estructura destino, actualmente placeholders con `.gitkeep`.

## Target tree

```text
apps/dashboard/
├── app/                  # routing + composición (thin, sin lógica de dominio)
├── features/
│   ├── articles/
│   ├── opinions/
│   ├── editorial-shared/ # allowlist: HistoryPanel, ScheduleSection, LocaleTabs,
│   │                     # SeoChecklist, validate-content, revision-diff, schedule
│   ├── media/            # dueño de MediaCard + MediaPicker + MediaManager
│   ├── categories/
│   ├── authors/
│   ├── planning/
│   ├── scheduling/       # solo vista /scheduled (ScheduledList + useScheduled)
│   ├── overview/
│   ├── analytics/
│   ├── notifications/
│   ├── syndication/
│   ├── audit/
│   ├── auth/             # UI (Login, RequireAuth, Logout); infra en shared/api
│   └── settings/
├── shared/
│   ├── components/       # Shell, Sidebar, Topbar, Breadcrumbs, Table/Paginator,
│   │                     # Modal/ConfirmDialog, States, Toasts, LoadingFallback,
│   │                     # RequireAuth, LogoutButton (solo genuinely reusable)
│   ├── api/              # apiFetch, getApiBase, HTTP/error helpers (agnóstico)
│   └── lib/              # theme, i18n providers, ui-prefs, dirty-guard, config
└── src/                  # legacy activo hasta completar migración (Fases 2-11)
```

Alias: `@/*` resuelve `./src/*` primero y `./*` después, de modo que
`@/lib/*` y `@/components/*` (legacy) siguen funcionando y
`@/features/*`, `@/shared/*` (destino) ya son importables.

## Dependency direction

```text
app
  ↓
features
  ↓
shared
```

* `shared/*` NUNCA importa `features/*`.
* `feature A → feature B` prohibido salvo excepciones aprobadas.
* `editorial-shared` NO importa `articles`, `opinions`, `media`, `planning` ni `scheduling`.

## Approved exceptions

* `articles`, `opinions` → `features/media` **solo picker público** (`MediaPicker`).
  Prohibido consumir `features/media/services/*` o internos.
* `scheduling` → `articles` / `opinions` **solo `listScheduled` público**.
  `articles` / `opinions` nunca importan `scheduling`.
* `planning` → `categories` solo lectura explícita.
* `articles` / `opinions` → `editorial-shared` permitido.
* `media` no depende de `articles`, `opinions` ni `editorial-shared`.

## Rules

1. `app/` solo compone features; sin fetch/transform/lógica de negocio.
2. Cada feature posee su UI, hooks, services, types, validación y tests.
3. `services/` son finos (`list/get/create/update/remove/transition/schedule/bulk`
   sobre `shared/api`); prohibidos Repository/Adapter/Facade/DI/enterprise patterns.
4. `shared/` intencionalmente pequeño y agnóstico: no conoce
   `/articles`, `/opinions`, `/media`, `/planning`, `/notifications`.
5. `editorial-shared` es allowlist cerrada (ver árbol); no es un segundo global.
6. `SeoChecklist` debe dejar namespace `articles` → neutral (`editorial`) en Fase 3.
7. `OpinionEditor → ArticleEditor (EditorOption)` se rompe en Fase 3
   (`EditorOption` a shared/editorial-shared).
8. `PlanningForm → GET /audit-log` para staff se resuelve sin tocar `apps/api`
   (abstracción cliente o documentar limitación) en Fase 8.
9. Sin cambios de URLs, API, DB, dependencias, CSS, state manager (React Context + local state).
10. i18n: se mantienen `src/messages/en.json`, `es.json`; sin migración amplia.

## Migration order (Fases 2-11)

2. Shared · 3. Editorial-shared · 4. Articles · 5. Opinions · 6. Media ·
7. Categories+Authors · 8. Planning · 9. Scheduling ·
10. Overview/Analytics/Notifications/Syndication/Audit/Auth/Settings (uno por vez) ·
11. Cleanup + validación completa.

## Quality gates (por fase)

Desde `apps/dashboard`: `npm run type-check`, `npm run lint`, `npm run build`.
E2E relevante desde `apps/e2e`. Antes de cada commit:
`git status`, `git diff --stat`, `git diff`. No commitear
`apps/dashboard/next-env.d.ts` ni `apps/storefront/next-env.d.ts` pre-existentes.
