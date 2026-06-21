# Verification Matrix — AncloraVisionFlow Fase 0
**Fecha:** 2026-06-21

| TASK | REQ | DESIGN | Archivo(s) | Test | Commit | Estado |
|---|---|---|---|---|---|---|
| TASK-0001 | REQ-SEC-001 | DES-SEC-001 | Caddyfile | Verificación manual (no hay XTransformPort) | pendiente | TODO |
| TASK-0002 | REQ-SEC-002 | DES-DEVOPS-001 | next.config.ts | bun run build sin errores TS | pendiente | TODO |
| TASK-0003 | REQ-OSS-001, REQ-OSS-002 | DES-AI-002 | route.ts, package.json | — | — | BLOCKED (DEC-OSS-001) |
| TASK-0004 | REQ-AI-006, REQ-ECOSYSTEM-006 | DES-AI-004 | sanitize.ts, anclora-catalog.ts | sanitize.test.ts | pendiente | TODO |
| TASK-0005 | REQ-AUTH-001 | DES-SEC-002 | middleware.ts | — | — | BLOCKED (DEC-AUTH-001) |
| TASK-0006 | REQ-SEC-004, REQ-SEC-007 | DES-SEC-003 | maps/route.ts, maps/[id]/route.ts, catalog/route.ts, catalog/[id]/route.ts, generate/route.ts | cobertura Zod | pendiente | TODO |
| TASK-0007 | REQ-SEC-008 | DES-DEVOPS-002 | .gitignore | git grep scan | N/A | DONE |
| TASK-0008 | REQ-SEC-009 | DES-SEC-004 | next.config.ts | curl -I headers | pendiente | TODO |

## Notas de verificación

### TASK-0001 (Caddyfile — eliminar XTransformPort)
- Archivo: `/home/toni/projects/anclora-visionflow/Caddyfile`
- Estado actual: bloque `@transform_port_query` activo en líneas 2-13
- Verificación post-fix: `grep -c XTransformPort Caddyfile` debe devolver 0

### TASK-0002 (next.config.ts — remover ignoreBuildErrors)
- Archivo: `/home/toni/projects/anclora-visionflow/next.config.ts`
- Estado actual: `ignoreBuildErrors: true` línea 7, `reactStrictMode: false` línea 9
- Verificación post-fix: `bun run build` exitoso sin errores TS; `grep ignoreBuildErrors next.config.ts` devuelve vacío

### TASK-0004 (sanitización agentsMd en prompts)
- Archivos: `src/lib/anclora-catalog.ts` (getCatalogForPrompt línea 73), `src/app/api/vision/generate/route.ts` (línea 188)
- Riesgo: contenido de AGENTS.md externo importado vía GitHub → prompt injection en LLM
- Verificación post-fix: sanitize.test.ts con fixtures de AGENTS.md maliciosos

### TASK-0006 (validación Zod en rutas POST)
- Rutas sin validación: maps/route.ts (POST línea 41), catalog/route.ts (POST línea 23), maps/[id]/route.ts
- Verificación post-fix: schemas Zod presentes y parseAsync usado antes de cualquier operación DB

### TASK-0007 (escaneo secretos)
- Ejecutado: 2026-06-21
- Resultado: CLEAN (hallazgos son strings placeholder en archivos de documentación importada)
- .gitignore cubre .env*: CONFIRMADO

### TASK-0008 (security headers)
- Archivo: next.config.ts (añadir bloque headers())
- Headers mínimos: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Verificación post-fix: `curl -I http://localhost:3000` muestra headers presentes
