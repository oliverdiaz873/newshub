# MCP en Newshub (exploración, no regresión)

Playwright MCP permite a un modelo de IA usar Playwright como herramienta
de ingeniería para **explorar, investigar, reproducir y depurar** Newshub.
No reemplaza a Playwright Test: la regresión determinista y CI siguen
siendo autoridad única (`apps/e2e/tests/`).

## Iniciar el entorno

MCP comparte el entorno E2E existente (sin infraestructura paralela).
Levanta el stack en los puertos E2E antes de la sesión:

```powershell
# Terminal 1 — API :3211
$env:DATABASE_URL="postgresql://postgres@localhost:5433/newshub_e2e"
$env:PORT="3211"; cd apps/api; npm run dev

# Terminal 2 — Dashboard :3212
$env:NEXT_PUBLIC_API_URL="http://localhost:3211/api/v1"
cd apps/dashboard; npm run dev -- --port 3212

# Terminal 3 — Storefront :3210
$env:NEXT_PUBLIC_API_URL="http://localhost:3211/api/v1"
cd apps/storefront; npm run dev -- --port 3210
```

## Iniciar MCP

```bash
cd apps/e2e
npm run mcp:start
# ≡ npx --yes @playwright/mcp@0.0.82 --config mcp.config.json
# (versión fijada: la serie de @playwright/mcp es 0.0.x — no existe 1.63.0;
# 0.0.82 empaqueta playwright 1.64.0-alpha, el pareo más cercano al Test 1.63.0)
```

Registra el servidor en tu cliente MCP (VS Code / Cursor / Claude Code)
apuntando a ese comando, o fija `PLAYWRIGHT_MCP_CONFIG` a
`apps/e2e/mcp.config.json`. Chromium abre en modo headed para observación
humana (`--headless` solo si el host lo requiere).

## Dónde está cada cosa

- Configuración: `apps/e2e/mcp.config.json` (`core` + Chromium + output).
- Prompt piloto: `apps/e2e/mcp/prompts/editorial-exploration.md`.
- Evidencia: `apps/e2e/.tmp/mcp-output/` (gitignored, nunca commitear).

## Reglas

- **Read-only operacional**: sin login, sin escrituras, sin destructivas
  (ver prompt). Es disciplina de sesión, no sandbox del servidor.
- **No concurrencia MCP/E2E**: comparten DB (`newshub_e2e`), storage,
  puertos y seed. Nunca `npm test` a la vez que una sesión MCP: el reseed
  a mitad de exploración invalida lo observado.
- **MCP fuera de CI**: sin jobs, gates ni artifacts. Herramienta de
  desarrollo.

## Relación MCP → Playwright Test

```
MCP explora/investiga → hallazgo + evidencia → análisis humano →
decisión → (si merece) Playwright Test → assertion → CI
```

Un descubrimiento no es un test hasta que un humano lo formaliza.

## Notas del piloto

### Chromium del runtime MCP

Si Playwright MCP reporta que Chromium no está instalado, instalar el
browser requerido mediante:

npx @playwright/mcp@0.0.82 install-browser chromium

El navegador se instala en la caché del usuario y no dentro del repositorio.
No es necesario convertirlo en una dependencia del proyecto ni modificar
el CI actual.

El Chromium utilizado por Playwright Test y el runtime de Playwright MCP
son runtimes independientes.

### Screenshots y outputDir

`browser_take_screenshot` puede resolver el filename respecto al working
directory aunque el servidor MCP tenga configurado `outputDir`.

Después de generar una captura, verificar físicamente su ubicación antes
de considerarla evidencia definitiva. Si es necesario, moverla al
directorio de evidencia documentado:

`apps/e2e/.tmp/mcp-output/`
