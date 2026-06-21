# Risk Register — AncloraVisionFlow Fase 0
**Fecha:** 2026-06-21

| ID | Descripción | Severidad | Estado | Tarea | Gate |
|---|---|---|---|---|---|
| RISK-CADDY-001 | Proxy XTransformPort permite SSRF vía query param a cualquier localhost:PORT | CRÍTICA | ACTIVO → TASK-0001 | TASK-0001 | GATE-CADDY-001 |
| RISK-TS-001 | ignoreBuildErrors: true en producción — errores TS silenciados | ALTA | ACTIVO → TASK-0002 | TASK-0002 | GATE-TS-001 |
| RISK-AUTH-001 | Sin auth en ninguna ruta API (maps, catalog, generate) | CRÍTICA | BLOQUEADO | TASK-0005 | GATE-AUTH-001/DEC-AUTH-001 |
| RISK-SDK-001 | z-ai-web-dev-sdk propietario y opaco (sin repositorio OSS verificable) | ALTA | BLOQUEADO | TASK-0003 | GATE-OSS-001/DEC-OSS-001 |
| RISK-INJ-001 | agentsMd/readme incluidos en prompts LLM sin sanitizar (slice no es sanitización) | CRÍTICA | ACTIVO → TASK-0004 | TASK-0004 | — |
| RISK-SCHEMA-001 | VisionMapRecord sin userId/workspaceId — datos no aislados por usuario | ALTA | FASE 1 | TASK-1001 | GATE-DB-001 |
| RISK-NEXUS-001 | Sin contrato Nexus firmado | ALTA | BLOQUEADO | TASK-1004 | GATE-NEXUS-001/DEC-NEXUS-001 |
| RISK-ZOD-001 | Rutas POST maps y catalog aceptan body sin validación Zod | ALTA | ACTIVO → TASK-0006 | TASK-0006 | — |
| RISK-HEADERS-001 | Sin security headers HTTP (CSP, X-Frame-Options, etc.) en next.config.ts | MEDIA | ACTIVO → TASK-0008 | TASK-0008 | — |

## Notas de evidencia

### RISK-CADDY-001
Caddyfile líneas 2-13: `@transform_port_query { query XTransformPort=* }` → `reverse_proxy localhost:{query.XTransformPort}`. Cualquier cliente puede hacer `GET /?XTransformPort=6379` para acceder a Redis local.

### RISK-INJ-001
`anclora-catalog.ts` línea 73: `a.agentsMd.slice(0, 300).replace(/\s+/g, " ")` — el replace de espacios no es sanitización. Contenido de AGENTS.md importado desde repos externos (via import-github) se incluye verbatim en el system prompt del LLM.

### RISK-ZOD-001
`maps/route.ts` línea 41: body destructuring sin schema. `catalog/route.ts` línea 23: `fields` tipado como `Record<string, unknown>` pasado directamente a `updateCatalogAppFields`.
