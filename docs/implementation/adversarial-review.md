# Revisión Adversarial — AncloraVisionFlow Fase 0

**Fecha:** 2026-06-21
**Rama:** feat/visionflow-fase0-hardening
**Revisor automatizado:** code-reviewer (Batch 5)
**Estado final:** PASS — sin findings críticos ni advertencias

---

## Metodología

Revisión adversarial estilo red-team sobre el diff completo (246 ins / 34 del, 9 archivos) de la rama `feat/visionflow-fase0-hardening` contra `development`. El revisor tuvo acceso a todos los archivos modificados sin contexto previo de implementación.

---

## TASK-0001 — Caddyfile (SSRF/port-pivoting)

| Check | Resultado |
|---|---|
| `@transform_port_query` eliminado completamente | PASS |
| Cero referencias residuales a `{query.XTransformPort}` | PASS |
| Headers de seguridad correctos (DENY, nosniff, strict-origin, -Server) | PASS |
| Un único bloque `handle {}` → localhost:3000 | PASS |
| Sintaxis Caddy válida (tabs, no spaces) | PASS |

**Findings:** ninguno.

---

## TASK-0008 — next.config.ts (HTTP headers)

| Check | Resultado |
|---|---|
| `headers()` async correctamente tipada en NextConfig | PASS |
| 5 headers presentes (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control) | PASS |
| `ignoreBuildErrors: true` mantenido (correcto — TASK-0002 bloqueada) | PASS |
| Resto de config intacta (standalone, reactStrictMode, serverActions) | PASS |

**Findings:** ninguno.

---

## TASK-0004 — sanitize.ts + apply (prompt injection)

| Check | Resultado |
|---|---|
| 11 patrones de inyección cubriendo vectores críticos (system tags, [SYSTEM], ###SYSTEM, ignore/disregard, you are now, act as if, new instructions, override, system prompt, jailbreak) | PASS |
| Límite hard de 500 chars aplicado | PASS |
| Normalización de whitespace correcta (3+ espacios → 1) | PASS |
| `sanitizeCatalogContent` importado y aplicado en `agentsMd` (línea 193 de generate/route.ts) | PASS |
| Campo `readme` no activo en el prompt builder (no es riesgo) | PASS |
| 9 test cases en sanitize.test.ts cubriendo todos los vectores | PASS |

**Findings:** ninguno.

---

## TASK-0006 — Zod validation (5 rutas API)

| Ruta | Schema | safeParse | Error seguro | Resultado |
|---|---|---|---|---|
| generate/route.ts | GenerateSchema (idea: min 3/max 2000/trim) | Línea 150 | INTERNAL_ERROR sin err.message | PASS |
| maps/route.ts | SaveMapSchema (title, tags, starred, palette...) | Línea 51 | VALIDATION_ERROR 400 | PASS |
| maps/[id]/route.ts | UpdateMapSchema (campos opcionales) | Línea 62 | VALIDATION_ERROR 400 | PASS |
| catalog/route.ts | UpdateCatalogAppSchema (id + fields) | Línea 39 | VALIDATION_ERROR 400 | PASS |
| catalog/[id]/route.ts | UpdateAppSchema (campos opcionales) | Línea 27 | VALIDATION_ERROR 400 | PASS |

Patrones Zod v4-compatibles verificados. Sin uso de patrones v3 legacy.

**Findings:** ninguno.

---

## Verificación de regresiones

| Archivo protegido | Estado |
|---|---|
| VisionBoard.tsx | NO modificado |
| src/lib/vision-map.ts | NO modificado |
| src/lib/anclora-ecosystem.ts | NO modificado |
| prisma/schema.prisma | NO modificado |
| src/lib/anclora-catalog.ts | NO modificado |

---

## Calidad de código

| Check | Resultado |
|---|---|
| Sin `@ts-ignore`, `@ts-nocheck`, `any` nuevos | PASS |
| Imports usan paths `@/` correctamente | PASS |
| Sin console.log con datos sensibles añadidos | PASS |
| Sin código muerto ni funciones huérfanas | PASS |
| Sin secretos hardcodeados | PASS |

---

## Vectores adversariales evaluados

1. **Bypass de sanitización via unicode homoglyphs** — los patrones regex actuales no cubren homoglyphs (ej. `ɪɢɴᴏʀᴇ`). Riesgo bajo para el MVP dado que el único canal de entrada es el catálogo interno. Registrado como observación, no bloqueante.

2. **Exfiltración via error message leak** — generate/route.ts manejaba `err.message` en catch anterior. Corregido: catch final devuelve mensaje genérico. PASS.

3. **Zod parse sin autenticación** — los schemas validan forma pero no identidad del llamante. TASK-0005 (auth) sigue bloqueada por DEC-AUTH-001. Riesgo conocido, registrado.

4. **Content-Security-Policy ausente** — los headers actuales no incluyen CSP. Recomendado para Fase 1 (TASK-1010 candidato). Nivel: MEDIA.

5. **Caddy header injection en X-Forwarded-For** — el campo `{remote_host}` en `header_up` usa el valor de Caddy, no del cliente; correcto para proxy con SSL termination.

---

## Veredicto

**PASS para PR a development.**

Todos los hallazgos del revisor son observaciones de nivel MEDIA/BAJA, ninguno bloquea el merge. Las tareas BLOCKED (TASK-0002, TASK-0003, TASK-0005) tienen justificación documentada y no son riesgos activos en este diff.

---

## Observaciones para fases posteriores

- **OBS-001** (MEDIA): Añadir Content-Security-Policy header en Fase 1.
- **OBS-002** (BAJA): Evaluar cobertura de unicode homoglyphs en sanitizeCatalogContent si el catálogo se abre a entradas externas no supervisadas.
- **OBS-003** (MEDIA): Una vez resuelto DEC-AUTH-001, los schemas Zod deberán añadir validación de sesión (middleware o guard en cada ruta).
