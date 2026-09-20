# Arquitectura MCP en Newshub

```
Playwright MCP → exploración → observación → evidencia →
análisis humano → decisión → Playwright Test →
assertion determinista → CI
```

## Por qué MCP comparte `apps/e2e`

El harness ya provee lo que una sesión necesita: puertos fijos sin
conflictos (`3211/3212/3210`), CORS explícito, seed reproducible y gate
anti-destructivo (`newshub_e2e`). Duplicarlo en un entorno `*_mcp`
paralelo añadiría mantenimiento sin valor mientras las sesiones sean
manuales y serializadas.

## Por qué no existe un entorno MCP separado

Mismo motivo: con uso serializado y controlado, el E2E basta. Si algún
día hay sesiones concurrentes u operaciones destructivas, se reevalúa.

## Por qué `core` es suficiente

Navegar, observar snapshots, clickar, escribir y capturar screenshots
cubre exploración y debugging. `network/storage/testing/vision` quedan
fuera por mínimo privilegio: menos superficie, intenciones más claras.

## Por qué no hay storageState

Los prompts iniciales prohíben login; no hay sesión que persistir.
Si un escenario futuro exige exploración autenticada, se usará un
`auth/*.json` gitignored (nunca commiteado), no antes.

## Por qué no hay múltiples contextos

No existe escenario concurrente. Un contexto basta; más contextos serían
complejidad sin comportamiento que la pida.

## Por qué MCP está fuera de CI

Los gates exigen determinismo reproducible. Las decisiones de un modelo
no bloquean integraciones. Como máximo futuro: disparo manual con
objetivos y criterios de éxito explícitos.
