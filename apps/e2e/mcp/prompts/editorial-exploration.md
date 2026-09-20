# MCP — Exploración editorial read-only (prompt piloto)

Objetivo: explorar el flujo editorial visible y la experiencia de
navegación/búsqueda de Newshub **sin modificar nada**, para descubrir
comportamientos, problemas de UX o escenarios que merezcan una prueba
determinista.

## Precondiciones

- Entorno E2E levantado y accesible (ver `docs/mcp/README.md`):
  - Storefront: `http://localhost:3210`
  - Dashboard: `http://localhost:3212`
- Servidor MCP iniciado con `npm run mcp:start` (`apps/e2e`).
- Trabaja con Chromium en modo headed para que un humano pueda observar.

## Alcance sugerido

1. **Storefront (público, sin login)**:
   - Portada `/es`: secciones, titulares, navegación principal.
   - Búsqueda `/es/search?q=politica`: resultados con contenido y
     estado vacío con un término sin resultados (p. ej. `zzzqnadaxyz`).
   - Variante EN (`/en/...`) cuando corresponda: comprobar idioma y
     fallback, sin asumir contenido concreto del seed.
   - Página de artículo: titular, contenido, navegación relacionada.
2. **Dashboard (sin login)**:
   - Observar únicamente la página `/login` (estructura, labels,
     accesibilidad). **No iniciar sesión**.
3. **Accesibilidad y estados**: roles, labels, headings, landmarks;
   estados visibles (vacío, error, 404 si aparece); navegación y
   breadcrumbs.

Evita depender de slugs, títulos o datos concretos del seed: usa términos
genéricos y lo que la propia interfaz exponga. Si algo no existe o cambió,
documéntalo como hallazgo en vez de asumirlo.

## Permitido

- Navegar (`browser_navigate`) y observar (`browser_snapshot`).
- Inspeccionar elementos, roles y nombres accesibles.
- Tomar screenshots ante anomalías o hallazgos (`browser_take_screenshot`).
- Analizar accesibilidad y documentar hallazgos.
- Reproducir comportamiento **visible** ya existente.
- Re-observar (nuevo snapshot) tras cada navegación o cambio de estado:
  las referencias (`ref`) son temporales y caducan con el estado.

## Prohibido

- Login, logout o cualquier uso de credenciales.
- `POST`, `PUT`, `PATCH`, `DELETE` o cualquier llamada de escritura.
- Crear, modificar, publicar, despublicar o archivar contenido.
- Cambios administrativos, de roles o de configuración.
- Modificar cookies, storage o archivos del proyecto.
- Operaciones destructivas de cualquier tipo.

**Read-only es una regla operacional de esta sesión, no una garantía
técnica del servidor**: `capabilities:["core"]` minimiza la superficie,
pero la responsabilidad de no mutar nada es del operador/modelo.

## Evidencia

Guarda snapshots y screenshots relevantes en `.tmp/mcp-output/`
(gitignored). Cada hallazgo debe incluir: dónde se observó (URL),
qué se esperaba, qué se vio y evidencia asociada.

## Cierre

Al finalizar, cierra el navegador (`browser_close`) y resume:
qué se exploró, hallazgos (con evidencia) y qué merecería convertirse
en issue, documentación o test determinista (decisión humana).
