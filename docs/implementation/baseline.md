# Baseline — AncloraVisionFlow Fase 0 Hardening
**Fecha:** 2026-06-21 | **Rama base:** development | **Rama trabajo:** feat/visionflow-fase0-hardening
**Commit base:** 48a5df2abfad653e13ccab8fcb58dcae859d46c9 feat: add SDD structure, specs and CI/CD workflows

## Stack verificado
- Next.js 16.1.1, React 19, Tailwind v4 (package.json verificado)
- Prisma 6.11.1 + SQLite (schema.prisma verificado)
- next-auth 4.24.11 (declarado en deps, NO wired en ninguna ruta API)
- z-ai-web-dev-sdk 0.0.18 (no OSS verificable — pendiente DEC-OSS-001)
- Bun como package manager (bun.lock presente) — instalado durante preflight: ~/.bun/bin/bun
- VisionBoard.tsx: EXISTE en src/components/vision/VisionBoard.tsx

## Rutas API existentes
- src/app/api/route.ts
- src/app/api/vision/catalog/[id]/route.ts (DELETE)
- src/app/api/vision/catalog/import-github/route.ts
- src/app/api/vision/catalog/import-txt/route.ts
- src/app/api/vision/catalog/route.ts (GET, POST)
- src/app/api/vision/generate/route.ts (GET, POST)
- src/app/api/vision/maps/[id]/route.ts (GET, DELETE)
- src/app/api/vision/maps/route.ts (GET, POST)

## Modelos Prisma
- User: id, email, name (sin relaciones con mapas)
- VisionMapRecord: sin userId/workspaceId/status/approvedAt
- AncloraAppRecord: sin workspaceId/reviewedBy/status

## Observaciones clave de archivos leídos
- Caddyfile: XTransformPort permite proxy a cualquier puerto local vía query param → SSRF crítico
- next.config.ts: ignoreBuildErrors: true activo, reactStrictMode: false, bodySizeLimit 20mb
- anclora-catalog.ts/getCatalogForPrompt: agentsMd se incluye en prompt sin sanitizar (slice(0,300) no es sanitización)
- generate/route.ts: usa z-ai-web-dev-sdk ZAI.create() directamente, sin auth check, idea del usuario interpolada en prompt de usuario (no sistema)
- maps/route.ts: sin validación Zod, sin auth, UPDATE por id sin verificar propiedad
- maps/[id]/route.ts: GET y DELETE sin auth, id viene directo de params a findUnique/delete
- catalog/route.ts: POST acepta fields como Record<string,unknown> sin validación de tipos de campo
- catalog/[id]/route.ts: DELETE sin auth

## Riesgos críticos activos pre-implementación
- RISK-CADDY-001: XTransformPort en Caddyfile → SSRF/port pivoting → CRÍTICA → TASK-0001
- RISK-TS-001: ignoreBuildErrors: true → errores TS en prod → ALTA → TASK-0002
- RISK-AUTH-001: Sin auth en rutas API → CRÍTICA → BLOQUEADO DEC-AUTH-001
- RISK-SDK-001: z-ai-web-dev-sdk no OSS → ALTA → BLOQUEADO DEC-OSS-001
- RISK-INJ-001: agentsMd sin sanitizar en prompts → CRÍTICA → TASK-0004
- RISK-SCHEMA-001: VisionMapRecord sin owner → ALTA → Fase 1

## Verificación inicial (pre-cambios)
- Bun install: COMPLETADO (849 packages installed en 26.97s)
- tsc --noEmit: 2 errores SOLO en examples/ (socket.io-client y socket.io tipos ausentes) — src/ limpio
- git secrets scan: hallazgos en upload/*.txt (placeholder/template strings como sk-ant-..., sk-ant-test, sk-ant-xxxxx) — NO son claves reales, son ejemplos de documentación
- .gitignore .env*: PRESENTE (.env* cubierto)
