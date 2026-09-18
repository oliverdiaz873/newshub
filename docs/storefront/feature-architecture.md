# Storefront Feature-Based Architecture

> Fuente de verdad de las reglas arquitectonicas del Storefront.
> Correccion ejecutada sobre `apps/storefront` (fases 0-6 + auditoria final).
> Todo futuro desarrollo del Storefront debe respetar este documento.

## Target tree

```text
apps/storefront/
├── app/                    # routing + composicion (pages, _components/*Client, _lib/page-content)
│   ├── [locale]/           # layout, page, category, news, opiniones, search, legal
│   │   ├── _components/    # SiteHeader + *PageClient (orquestacion delgada, 'use client' donde toca)
│   │   └── _lib/           # page-content.ts (buildHomeContent, buildCategoryContent, HomePageContent)
│   └── sitemap.ts          # compone via features/news/services (deep, server-safe)
├── src/
│   ├── features/
│   │   ├── news/           # dominio editorial unico (articles + opinions + search + traducciones)
│   │   │   ├── components/ # Breaking, Featured, Latest, OpinionSidebar, RecentSidebar, ArticleDetail, SearchBar
│   │   │   ├── hooks/      # useSearch, useArticleTranslation, useCategoryTranslation
│   │   │   └── services/   # news-content.ts: mappers toNews/toOpinion, resolveArticleImage,
│   │   │                   # searchAll (SOLO porque hay logica propia de news, no por simetria)
│   │   └── navigation/     # DesktopNav/TabletNav/MobileNav/Breadcrumb + config/navItems (pura)
│   ├── shared/             # transversal reutilizable, NUNCA importa features/
│   │   ├── api/            # (conceptual: hoy src/lib/api.ts) getApiBase, apiGet, no-store, outcomes, Api*
│   │   ├── components/     # ThemeToggle, LanguageSelector, EmptyState, ScrollToTop, icons (SIN SearchBar)
│   │   ├── layouts/        # NewsLayout, LegalLayout, Footer (SIN Header-composicion)
│   │   ├── config/         # site, seo, fonts
│   │   └── utils/          # searchUtils
│   ├── data/               # newsModels.ts: kernel compartido de view-models (ver decision D4)
│   ├── lib/                # api.ts = shared/api (infra HTTP + contratos Api*, sin dominio)
│   ├── theme/ i18n/ ui/ assets/ styles/
```

## Dependency direction

```text
app
  ↓
features
  ↓
shared (lib, data-kernel, config, utils, theme)
```

* `shared → features = PROHIBIDO` (hallazgo H1 corregido en Fase 1).
* `features → shared = permitido` (ej. `useSearch → shared/utils + lib/api`).
* `app → features + shared` = permitido (composicion: `SiteHeader`, pages, `_lib`).
* `news ↔ navigation` = 0 imports (aislamiento horizontal; mantener).

## Ownership decidido (Fase 2)

| Elemento | Owner | Razon |
|---|---|---|
| `SiteHeader` | `app/[locale]/_components` | Compone navigation + news(SearchBar) + shared; no es UI generica |
| `SearchBar` | `features/news/components` | Conoce `useSearch` + traductor editorial; no es transversal |
| `searchAll, toNews*, toOpinion*, resolveArticleImage` | `features/news/services` | Logica propia de news extraida de `lib/api` |
| `getApiBase, apiGet*, outcomes, Api*` | `src/lib/api` (shared-infra) | HTTP generico + contratos, agnostico de dominio |
| `buildHome/CategoryContent` | `app/[locale]/_lib` | Curaduria de pagina (pools, dedup, slices), no dominio |
| `newsModels.ts` | `src/data` (kernel, SE QUEDA) | Lo usan infra + features + app; moverlo a `features/news` crearia `infra → features` (peor) |
| `coverUrl, ScheduleDto` | `apps/api` (NO storefront) | H5 era hallazgo del backend; tratar en auditoria API independiente |

## Superficies publicas (Fase 5, minima)

* Componentes: `@/features/news/components` (barrel; client-safe).
* Navegacion: `@/features/navigation/components` (barrel; lo consume `SiteHeader` en `app/`).
* Servicios editoriales (server-safe, sin React): import profundo
  `@/features/news/services/news-content` — a proposito NO se exporta
  desde `features/news/index.ts` para no arrastrar hooks/componentes
  client al bundle server (ej. `sitemap.ts`) ni logica server al client.
* No crear barrels masivos nuevos; exponer solo lo ya consumido fuera.

## news NO se divide (Fase 6, decision)

`features/news` sigue siendo el unico dominio editorial (articles, opinions,
search, home-content, traducciones). Dividirlo en `articles/opinions/search/`
crearia edges cross-feature (`search → articles + opinions`,
`home → articles + opinions + categories`) sin beneficio para el equipo/deploy
actual. Reevaluar solo si: search adquiere ranking/facets propios, opinions
adquiere workflow propio, aparecen ciclos, o `services/` supera ~500L con
responsabilidades separables.

## Quality gates

Desde `apps/storefront` ante cualquier cambio: `npm run type-check`,
`npm run lint`, `npm run build`. E2E relevante desde `apps/e2e`.
Antes de cada commit: `git status`, `git diff --stat`, `git diff`.
Regla de arquitectura: grep `from.*features` en `src/shared` debe ser 0.
