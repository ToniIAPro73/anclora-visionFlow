# TASK — AncloraVisionFlow
**Versión:** 1.0.0 | **Fecha:** 2026-06-21 | **Estado:** LISTO PARA PLANIFICAR
**Equipo autor:** Staff Architect · Product Strategist · DevOps · QA Lead · Security Engineer

> **Convenciones de trazabilidad**
> - Cada tarea referencia: `REQ-XXX-NNN` (requisito) y `DES-XXX-NNN` (diseño)
> - Gates humanos: `[GATE-XXX-NNN]` — bloqueante hasta aprobación
> - Duración estimada: estimación de referencia, no compromiso
> - Estado: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED`

---

## Resumen Ejecutivo de Fases

| Fase | Nombre | Objetivo | Resultado observable |
|---|---|---|---|
| **Fase 0** | Seguridad y Hardening | Convertir el repo en un sistema seguro y correcto | Sin proxy dinámico, build sin errores TS, auth activa en todas las rutas |
| **Fase 1** | Propuestas Gobernadas | Ciclo de vida de propuestas + handoff Nexus | Workspaces, RBAC, estados de propuesta, handoff Nexus con confirmación humana |
| **Fase 2** | IA Avanzada y Async | RAG sobre catálogo, embeddings, jobs async | Búsqueda semántica sobre catálogo, generación más precisa |
| **Fase 3** | Colaboración y Premium | Multi-usuario, notificaciones, tier premium | Edición colaborativa, comentarios, exportación avanzada |
| **Fase V** | Verificación | Auditoría transversal antes de cada release | Tests ≥ 80%, CI green, sin secretos, accesibilidad validada |

---

## FASE 0 — Seguridad y Hardening

> **Objetivo:** Ningún riesgo crítico activo. El sistema es correcto, seguro y auditado antes de recibir usuarios reales.
> **Criterio de salida:** `[GATE-CADDY-001]` + `[GATE-TS-001]` + `[GATE-SEC-001]` + `[GATE-AUTH-001]` + `[GATE-OSS-001]` todos APROBADOS.

---

### TASK-0001 · Eliminar proxy dinámico XTransformPort del Caddyfile
**Fase:** 0 | **Prioridad:** CRÍTICA | **Duración estimada:** 30 min | **Estado:** TODO
**Refs:** REQ-SEC-001, DES-SEC-001 | **Gate:** GATE-CADDY-001

**Descripción:** El bloque `@transform_port_query` en `Caddyfile` permite SSRF y port pivoting sin autenticación. Debe eliminarse antes de cualquier despliegue.

**Criterios de aceptación:**

- [ ] Bloque `@transform_port_query` y su `handle` eliminados del `Caddyfile`
- [ ] Solo queda el `handle` que proxea a `localhost:3000`
- [ ] Añadidos headers de seguridad (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, -Server)
- [ ] La app responde correctamente via Caddy tras el cambio
- [ ] `[GATE-CADDY-001]` aprobado por DevOps + Security antes de merge

---

### TASK-0002 · Corregir errores TypeScript y desactivar ignoreBuildErrors
**Fase:** 0 | **Prioridad:** ALTA | **Duración estimada:** 2-4h | **Estado:** TODO
**Refs:** REQ-SEC-002, DES-DEVOPS-001 | **Gate:** GATE-TS-001

**Descripción:** `typescript.ignoreBuildErrors: true` en `next.config.ts` permite builds con errores de tipo. Debe corregirse.

**Criterios de aceptación:**

- [ ] Ejecutar `npx tsc --noEmit` y corregir todos los errores reportados
- [ ] Establecer `typescript.ignoreBuildErrors: false` en `next.config.ts`
- [ ] `bun run build` pasa sin errores TS
- [ ] `[GATE-TS-001]` aprobado por QA Lead antes de merge

---

### TASK-0003 · Evaluar y reemplazar z-ai-web-dev-sdk por SDK OSS
**Fase:** 0 | **Prioridad:** CRÍTICA | **Duración estimada:** 2h evaluación + 2h migración | **Estado:** BLOCKED
**Refs:** REQ-OSS-001, REQ-OSS-002, DES-AI-002 | **Gate:** GATE-OSS-001 (DEC-OSS-001)

**Descripción:** `z-ai-web-dev-sdk 0.0.18` es opaco, no OSS verificable y no self-hostable. Viola REQ-OSS-001. Las herramientas y librerías open source siempre tienen prioridad.

**Sub-tareas:**

- [ ] **TASK-0003a:** Identificar qué proveedor LLM usa `z-ai-web-dev-sdk` (leer código fuente del paquete en `node_modules/`)
- [ ] **TASK-0003b:** Evaluar opciones OSS: `@anthropic-ai/sdk`, `openai` npm, `ai` (Vercel AI SDK)
- [ ] **TASK-0003c [DEC-OSS-001 DECISIÓN HUMANA]:** Seleccionar SDK OSS y documentar en Bóveda
- [ ] **TASK-0003d:** Reemplazar `ZAI.create()` y `zai.chat.completions.create()` en `src/app/api/vision/generate/route.ts` por el SDK elegido
- [ ] **TASK-0003e:** Configurar `LLM_API_KEY` y `LLM_MODEL` como variables de entorno
- [ ] **TASK-0003f:** Eliminar `z-ai-web-dev-sdk` de `package.json`
- [ ] La interfaz `generate` sigue funcionando con el nuevo SDK
- [ ] `[GATE-OSS-001]` aprobado por OSS Evaluator + CTO

---

### TASK-0004 · Sanitizar contenido del catálogo antes de incluirlo en prompts LLM
**Fase:** 0 | **Prioridad:** CRÍTICA | **Duración estimada:** 2h | **Estado:** TODO
**Refs:** REQ-AI-006, REQ-ECOSYSTEM-006, REQ-SEC-006, DES-AI-004

**Descripción:** Los campos `readme` y `agentsMd` de `AncloraAppRecord` se incluyen en el system prompt del LLM sin sanitización. Esto permite prompt injection desde contenido importado.

**Criterios de aceptación:**

- [ ] Implementar función `sanitizeCatalogContent(raw: string): string` en `src/lib/` (ver DES-AI-004)
- [ ] Aplicar `sanitizeCatalogContent` sobre `readme` y `agentsMd` antes de incluirlos en cualquier prompt en `getCatalogForPrompt()`
- [ ] La función elimina: delimitadores de sistema, instrucciones de override, patrones de jailbreak conocidos
- [ ] Límite hard de 500 chars por campo de catálogo incluido en prompt
- [ ] Test unitario: `sanitizeCatalogContent` con payloads de injection conocidos → `[REDACTADO]`
- [ ] `code-reviewer` aprueba la implementación antes de merge

---

### TASK-0005 · Implementar autenticación next-auth en todas las rutas API
**Fase:** 0 | **Prioridad:** CRÍTICA | **Duración estimada:** 4-6h | **Estado:** BLOCKED
**Refs:** REQ-AUTH-001, REQ-SEC-003, DES-SEC-002 | **Gate:** GATE-AUTH-001 (DEC-AUTH-001)

**Descripción:** Ninguna ruta API está protegida. `next-auth 4.24.11` está instalado pero no configurado.

**Sub-tareas:**

- [ ] **TASK-0005a [DEC-AUTH-001 DECISIÓN HUMANA]:** Definir provider next-auth (credentials local vs OAuth vs SSO Anclora)
- [ ] **TASK-0005b:** Crear `src/app/api/auth/[...nextauth]/route.ts` con `authOptions`
- [ ] **TASK-0005c:** Crear `src/middleware.ts` con `withAuth` matcher sobre `/api/vision/**`
- [ ] **TASK-0005d:** Crear `src/lib/auth.ts` con helper `requireSession(req)` para uso en route handlers
- [ ] **TASK-0005e:** Añadir `requireSession()` al inicio de cada route handler existente
- [ ] **TASK-0005f:** Variables de entorno: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [ ] Todas las rutas API retornan 401 sin sesión válida
- [ ] Login flow funciona end-to-end
- [ ] `[GATE-AUTH-001]` aprobado por Responsable de Seguridad antes de merge

---

### TASK-0006 · Validación de entrada con Zod en todas las rutas POST/PUT
**Fase:** 0 | **Prioridad:** ALTA | **Duración estimada:** 2h | **Estado:** TODO
**Refs:** REQ-SEC-004, REQ-SEC-007, DES-SEC-003

**Descripción:** Las rutas API no validan el body con Zod. Zod está instalado (`^4.0.2`) pero no se usa en las rutas verificadas.

**Criterios de aceptación:**

- [ ] `POST /api/vision/generate`: schema `GenerateSchema = z.object({ idea: z.string().min(3).max(2000) })`
- [ ] `POST /api/vision/maps`: schema con campos requeridos del mapa
- [ ] `PUT /api/vision/maps/[id]`: schema de actualización parcial
- [ ] `POST /api/vision/catalog/import-txt`: validación del body y tamaño (ya hay `bodySizeLimit: "20mb"`)
- [ ] Los errores de validación retornan `{ code: "VALIDATION_ERROR", message: "..." }` sin detalles internos
- [ ] Los errores internos NO retornan `err.message` directamente (arreglar `route.ts:350`)

---

### TASK-0007 · Escaneo de secretos antes de push
**Fase:** 0 | **Prioridad:** CRÍTICA | **Duración estimada:** 30 min | **Estado:** TODO
**Refs:** REQ-SEC-008 | **Gate:** GATE-SEC-001

**Descripción:** Verificar que no hay claves de API hardcodeadas en el repositorio.

**Criterios de aceptación:**

- [ ] Ejecutar `git grep -rE "(sk-|api_key|apiKey|API_KEY|secret)" -- ":(exclude)*.env*"` y verificar cero hits de secretos reales
- [ ] Verificar que `.gitignore` incluye `.env`, `.env.local`, `.env*.local`
- [ ] Verificar que `DATABASE_URL` no tiene valor hardcodeado en ningún archivo commiteado
- [ ] Añadir `gitleaks` o `trufflehog` como pre-commit hook (OSS)
- [ ] `[GATE-SEC-001]` aprobado por Security Engineer

---

### TASK-0008 · Headers de seguridad HTTP en Next.js config
**Fase:** 0 | **Prioridad:** ALTA | **Duración estimada:** 30 min | **Estado:** TODO
**Refs:** REQ-SEC-009, DES-SEC-004

**Criterios de aceptación:**

- [ ] Añadir `headers()` a `next.config.ts` con: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy
- [ ] Build sigue pasando tras el cambio

---

## FASE 1 — Propuestas Gobernadas + Handoff Nexus

> **Objetivo:** Ciclo de vida completo de propuestas con RBAC, workspaces y handoff humano-aprobado a Nexus.
> **Prerequisito:** Todos los gates de Fase 0 APROBADOS.
> **Criterio de salida:** `[GATE-DB-001]` + `[GATE-NEXUS-001]` APROBADOS + cobertura de tests ≥ 60%.

---

### TASK-1001 · Migración de esquema: añadir Workspace, WorkspaceMember y campos de gobernanza
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-AUTH-002, REQ-AUTH-003, REQ-CAT-005, REQ-CAT-006, DES-DATA-002 | **Gate:** GATE-DB-001

**Sub-tareas:**

- [ ] **TASK-1001a:** Crear modelo `Workspace` y `WorkspaceMember` en `prisma/schema.prisma`
- [ ] **TASK-1001b:** Añadir `workspaceId`, `ownerId`, `status`, `approvedAt`, `approvedById`, `promptVersion`, `llmModel`, `tokensUsed` a `VisionMapRecord`
- [ ] **TASK-1001c:** Añadir `workspaceId`, `reviewedBy`, `reviewedAt`, `status`, `commitSha` a `AncloraAppRecord`
- [ ] **TASK-1001d:** Añadir relación `User` → `WorkspaceMember`
- [ ] Ejecutar `migration-reviewer` sobre la migración antes de aplicar
- [ ] `[GATE-DB-001]` aprobado por Staff Architect + DBA
- [ ] Migración aplicada con `prisma migrate dev`
- [ ] Rollback plan documentado

---

### TASK-1002 · Implementar RBAC: roles viewer/editor/admin por workspace
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-AUTH-003, DES-SEC-002

**Criterios de aceptación:**

- [ ] Helper `getWorkspaceRole(session, workspaceId): "viewer" | "editor" | "admin" | null`
- [ ] Todas las rutas de catálogo (`POST`, `PUT`, `DELETE`) verifican rol `admin`
- [ ] Rutas de generación y guardado de mapas verifican rol `editor+`
- [ ] Rutas de lectura verifican rol `viewer+`
- [ ] Tests unitarios para helper RBAC con fixtures de session/workspace

---

### TASK-1003 · Ciclo de vida de propuesta: estados y transiciones
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 4h | **Estado:** TODO
**Refs:** REQ-PROP-001, REQ-PROP-002, DES-FLOW-001

**Sub-tareas:**

- [ ] `POST /api/vision/maps/[id]/submit` — editor → cambia estado draft → review
- [ ] `POST /api/vision/maps/[id]/approve` — admin → cambia estado review → approved
- [ ] `POST /api/vision/maps/[id]/reject` — admin → devuelve a draft con comentario
- [ ] `POST /api/vision/maps/[id]/archive` — admin/owner → archived
- [ ] Transiciones inválidas retornan 409 con mensaje descriptivo
- [ ] Metadatos de aprobación (`approvedAt`, `approvedById`) se persisten
- [ ] Tests de máquina de estados

---

### TASK-1004 · Handoff a Nexus: generación de borrador y confirmación humana
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 4h | **Estado:** BLOCKED
**Refs:** REQ-PROP-004, REQ-ECOSYSTEM-001, REQ-ECOSYSTEM-002, DES-NEXUS-001, DES-NEXUS-002 | **Gate:** GATE-NEXUS-001

**Sub-tareas:**

- [ ] **TASK-1004a [DEC-NEXUS-001 DECISIÓN HUMANA]:** Validar contrato API Nexus desde Bóveda
- [ ] **TASK-1004b:** Implementar `src/lib/nexus-handoff.ts` con `createNexusDraftTask()` y `submitNexusTask()`
- [ ] **TASK-1004c:** `POST /api/vision/maps/[id]/handoff/nexus` — genera borrador (sin llamar Nexus API)
- [ ] **TASK-1004d:** `POST /api/vision/maps/[id]/handoff/nexus/confirm` — envía borrador confirmado a Nexus y actualiza estado a `handed_off`
- [ ] **TASK-1004e:** UI: modal de preview del borrador Nexus antes de confirmar
- [ ] **TASK-1004f:** Log de auditoría: registrar handoff con userId, timestamp, nexusTaskId
- [ ] Solo admin puede confirmar handoff
- [ ] Solo mapas con status=approved pueden iniciar handoff
- [ ] `[GATE-NEXUS-001]` aprobado por Product Strategist + Nexus Owner antes de activar

---

### TASK-1005 · Política LLM por workspace
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 2h | **Estado:** TODO
**Refs:** REQ-AUTH-004, DES-DEVOPS-002

**Criterios de aceptación:**

- [ ] Campo `llmPolicy` (JSON) en modelo `Workspace`: `{ provider, model, maxTokensPerMonth, allowedDataTypes }`
- [ ] La ruta `generate` lee la política del workspace antes de llamar al LLM
- [ ] Si se supera `maxTokensPerMonth`, retorna 429 con mensaje claro
- [ ] Admin de workspace puede actualizar la política

---

### TASK-1006 · Versionado y trazabilidad del prompt del sistema
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 2h | **Estado:** DONE
**Refs:** REQ-AI-002, REQ-AI-007, DES-AI-003

**Criterios de aceptación:**

- [x] `PROMPT_VERSION` exportado como constante semver desde `route.ts` o módulo dedicado
- [x] Cada respuesta de generación exitosa persiste `promptVersion`, `llmModel`, `tokensUsed` en `VisionMapRecord` solo con recibo server-verifiable
- [x] `GET /api/vision/generate` retorna la versión del prompt actual

---

### TASK-1007 · Rate limiting en endpoint de generación
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 2h | **Estado:** TODO
**Refs:** REQ-AI-005, REQ-SEC-005

**Criterios de aceptación:**

- [ ] Implementar rate limiting OSS (ej. `@upstash/ratelimit` con Redis in-memory o `lru-cache`) por `userId`
- [ ] Límite configurable: N peticiones por ventana de tiempo
- [ ] Retorna 429 con header `Retry-After` cuando se supera el límite
- [ ] Prioridad OSS: no usar servicios SaaS de rate limiting sin gate aprobado

---

### TASK-1008 · Configurar suite de tests (Vitest + RTL)
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 2h | **Estado:** TODO
**Refs:** REQ-QA-001, REQ-QA-002, DES-DEC-009

**Criterios de aceptación:**

- [ ] Instalar `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`
- [ ] Añadir script `"test": "vitest run"` y `"test:watch": "vitest"` en `package.json`
- [ ] Configurar `vitest.config.ts`
- [ ] Test de smoke: `sanitizeCatalogContent` + `layoutVisionMap` + `autoConnect` + `repairTruncatedJson`
- [ ] Test de componente: render de `VisionNodeCard` sin crash
- [ ] Cobertura mínima inicial: 50% en `src/lib/`

---

### TASK-1009 · Configurar CI/CD con GitHub Actions
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 1h | **Estado:** TODO
**Refs:** REQ-QA-003, DES-DEVOPS-001

**Criterios de aceptación:**

- [ ] `.github/workflows/ci.yml`: lint → typecheck → test → build
- [ ] El pipeline falla si lint, TS o tests fallan
- [ ] El pipeline pasa en cada PR a `main`
- [ ] `commit` agent no puede hacer merge directo a `main` sin CI verde

---

### TASK-1010 · Accesibilidad mínima WCAG 2.1 AA
**Fase:** 1 | **Prioridad:** ALTA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-UX-001, DES-UX-004

**Criterios de aceptación:**

- [ ] Todos los botones icon-only tienen `aria-label`
- [ ] Contraste ≥ 4.5:1 para texto sobre paletas dark (verificar con palette `anclora`, `nexus`, `premium`)
- [ ] Animaciones de Framer Motion respetan `prefers-reduced-motion`
- [ ] Canvas de VisionBoard tiene `role="application"` y `aria-label`
- [ ] Dispatch `frontend-qa` para revisión de a11y antes de merge

---

### TASK-1011 · Health check endpoint
**Fase:** 1 | **Prioridad:** MEDIA | **Duración estimada:** 30 min | **Estado:** TODO
**Refs:** REQ-QA-005

**Criterios de aceptación:**

- [ ] `GET /api/health` retorna JSON: `{ status: "ok", db: "ok"|"error", llm: "ok"|"degraded", version: "...", buildAt: "..." }`
- [ ] Caddy puede usarlo como health check antes de servir tráfico

---

### TASK-1012 · Internacionalización ES/EN con next-intl
**Fase:** 1 | **Prioridad:** MEDIA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-UX-002

**Criterios de aceptación:**

- [ ] `next-intl 4.3.4` configurado con locales `es` y `en`
- [ ] Todos los strings UI en archivos de mensajes (no hardcoded)
- [ ] El system prompt del LLM sigue generando en español (`[VERIFICADO]` — ya lo hace)
- [ ] Selector de idioma en UI

---

## FASE 2 — IA Avanzada y Async

> **Prerequisito:** Fase 1 completa y gates aprobados.
> **Objetivo:** RAG sobre catálogo, jobs async, exportación SyncXML.

---

### TASK-2001 · RAG sobre catálogo con embeddings
**Fase:** 2 | **Prioridad:** ALTA | **Duración estimada:** 5h | **Estado:** TODO
**Refs:** REQ-AI-005 (extensión), DES-DEC-007

**Sub-tareas:**

- [ ] **TASK-2001a [DEC-DB-001 DECISIÓN HUMANA]:** Decidir si migrar a PostgreSQL + pgvector o usar SQLite con `better-sqlite3-fts5`
- [ ] **TASK-2001b:** Si PostgreSQL: migrar datos de SQLite a PostgreSQL
- [ ] **TASK-2001c:** Generar embeddings para `AncloraAppRecord` (description, capabilities, agentsMd sanitizado)
- [ ] **TASK-2001d:** Reemplazar keyword matching en `generate/route.ts:159-174` por búsqueda semántica
- [ ] Proveedor de embeddings: OSS first (Ollama + nomic-embed, o sentence-transformers via API local)

---

### TASK-2002 · Jobs asíncronos para generación de mapas complejos
**Fase:** 2 | **Prioridad:** MEDIA | **Duración estimada:** 4h | **Estado:** TODO
**Refs:** REQ-AI-005 (extensión)

**Criterios de aceptación:**

- [ ] Para ideas largas o catálogos grandes, la generación pasa a job async
- [ ] UI muestra estado del job con polling o SSE (OSS: no Pusher/Ably sin gate)
- [ ] Job timeout configurable, cancelable por el usuario

---

### TASK-2003 · Exportación a SyncXML
**Fase:** 2 | **Prioridad:** MEDIA | **Duración estimada:** 3h | **Estado:** BLOCKED
**Refs:** REQ-SYNCXML-001, REQ-SYNCXML-002, REQ-SYNCXML-003, REQ-SYNCXML-004, DES-SYNC-001 | **Gate:** DEC-SYNC-001

**Sub-tareas:**

- [ ] **TASK-2003a [DEC-SYNC-001 DECISIÓN HUMANA]:** Validar esquema XML con equipo SyncXML
- [ ] **TASK-2003b:** Implementar `src/lib/syncxml-export.ts` que genera XML válido desde `VisionMapRecord`
- [ ] **TASK-2003c:** Validar XML contra XSD antes de mostrar preview
- [ ] **TASK-2003d:** UI: botón "Exportar a SyncXML" en mapas aprobados, con preview modal y confirmación explícita
- [ ] **TASK-2003e:** Registrar cada exportación en audit log (timestamp, userId, mapId, hash del payload)

---

### TASK-2004 · Historial de versiones de mapas
**Fase:** 2 | **Prioridad:** MEDIA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-MAP-009

**Criterios de aceptación:**

- [ ] Modelo `VisionMapVersion` con: mapId, versionNumber, snapshot (JSON), createdAt, createdBy
- [ ] Cada actualización de mapa crea una versión (máx 5 versiones por mapa)
- [ ] UI: timeline de versiones con opción de restaurar (con confirmación)

---

## FASE 3 — Colaboración y Premium

> **Prerequisito:** Fase 2 completa. Estas features son aditivas y no bloquean el valor core.

---

### TASK-3001 · Comentarios en propuestas
**Fase:** 3 | **Prioridad:** MEDIA | **Duración estimada:** 3h | **Estado:** TODO
**Refs:** REQ-PROP-002 (extensión)

**Criterios de aceptación:**

- [ ] Modelo `ProposalComment`: mapId, userId, body, createdAt, resolvedAt
- [ ] UI: panel de comentarios en la vista de propuesta
- [ ] Solo miembros del workspace pueden comentar

---

### TASK-3002 · Notificaciones de cambio de estado
**Fase:** 3 | **Prioridad:** MEDIA | **Duración estimada:** 2h | **Estado:** TODO

**Criterios de aceptación:**

- [ ] Notificación in-app cuando una propuesta cambia de estado
- [ ] Email opcional (OSS: Nodemailer con SMTP propio, no SaaS sin gate)

---

### TASK-3003 · Edición colaborativa básica
**Fase:** 3 | **Prioridad:** BAJA | **Duración estimada:** 5h | **Estado:** TODO
**Refs:** REQ-MAP-010 (extensión), DES-DEC-001 (extensión)

**Sub-tareas:**

- [ ] **[DEC-COLLAB-001 DECISIÓN HUMANA]:** CRDT (Yjs OSS) vs optimistic locking simple
- [ ] Indicadores de presencia de otros usuarios en el canvas
- [ ] Resolución de conflictos de edición simultánea

---

### TASK-3004 · Tier premium: features y modelo de acceso
**Fase:** 3 | **Prioridad:** BAJA | **Duración estimada:** TBD | **Estado:** TODO
**Refs:** DES-DEC-007 (extensión), DEC-PREMIUM-001

- [ ] **[DEC-PREMIUM-001 DECISIÓN HUMANA]:** Definir features premium y modelo de monetización
- [ ] Feature flag por workspace para habilitar tier premium

---

## FASE V — Verificación Transversal

> Ejecutar antes de cada release mayor. No es una fase secuencial, es una checklist de auditoría.

---

### TASK-V001 · Auditoría de seguridad pre-release
**Fase:** V | **Prioridad:** CRÍTICA

**Checklist:**

- [ ] `GATE-CADDY-001`: Caddyfile sin XTransformPort
- [ ] `GATE-TS-001`: Build TS limpio
- [ ] `GATE-SEC-001`: Escaneo de secretos limpio
- [ ] `GATE-AUTH-001`: Auth activa en todas las rutas
- [ ] Revisar headers HTTP con `curl -I` o `securityheaders.com` (OSS equivalent)
- [ ] Verificar que `ignoreBuildErrors: false`
- [ ] Verificar que no hay rutas sin `requireSession()`
- [ ] Verificar que `sanitizeCatalogContent` está activo

---

### TASK-V002 · Cobertura de tests
**Fase:** V | **Prioridad:** ALTA

**Checklist:**

- [ ] `src/lib/`: cobertura ≥ 80%
- [ ] Rutas API críticas (`generate`, `maps`, `catalog`): tests de integración
- [ ] Funciones de sanitización: cobertura 100%
- [ ] Tests de máquina de estados de propuesta: todos los caminos cubiertos

---

### TASK-V003 · Accesibilidad con herramienta automatizada
**Fase:** V | **Prioridad:** ALTA

**Checklist:**

- [ ] Ejecutar `axe-core` (OSS) o `playwright` con axe plugin sobre las vistas principales
- [ ] Cero errores de nivel AA en VisionBoard, CatalogDialog y flujo de propuesta
- [ ] Informe firmado por `frontend-qa` antes de release

---

### TASK-V004 · Verificación de integraciones externas
**Fase:** V | **Prioridad:** ALTA

**Checklist:**

- [ ] Handoff Nexus: test en staging con payload real (no producción)
- [ ] Exportación SyncXML: XML válido contra XSD
- [ ] Verificar que ningún test toca datos de producción

---

## Tabla de Gates de Aprobación Humana

| Gate | Descripción | Bloqueante para | Responsable | Estado |
|---|---|---|---|---|
| GATE-CADDY-001 | Eliminar XTransformPort de Caddyfile | Despliegue Fase 0 | DevOps + Security | ⏳ PENDIENTE |
| GATE-TS-001 | Build TS sin errores | Despliegue Fase 0 | QA Lead | ⏳ PENDIENTE |
| GATE-SEC-001 | Escaneo de secretos limpio | Push a remoto | Security Engineer | ⏳ PENDIENTE |
| GATE-AUTH-001 | Auth activa en producción | Usuarios reales | Responsable Seguridad | ⏳ PENDIENTE |
| GATE-OSS-001 (DEC-OSS-001) | SDK OSS seleccionado y z-ai-web-dev-sdk reemplazado | Prod con LLM | OSS Evaluator + CTO | ⏳ PENDIENTE |
| GATE-DB-001 | Migración de esquema aprobada | Fase 1 | Staff Architect | ⏳ PENDIENTE |
| GATE-NEXUS-001 (DEC-NEXUS-001) | Contrato Nexus validado, handoff activado | Fase 1 handoff | Product + Nexus Owner | ⏳ PENDIENTE |
| GATE-PROD-001 | Primer despliegue a producción | Usuarios producción | Todos los leads | ⏳ PENDIENTE |

---

## Orden de Ejecución Recomendado (Fase 0)

```
TASK-0007 (secretos)           → sin dependencias, ejecutar primero
TASK-0001 (Caddy)              → independiente, ejecutar en paralelo
TASK-0002 (TS errors)          → independiente, ejecutar en paralelo
TASK-0003 (SDK OSS) [BLOQ]     → espera DEC-OSS-001 humano
TASK-0004 (sanitización)       → independiente
TASK-0005 (next-auth) [BLOQ]   → espera DEC-AUTH-001 humano, ejecutar tras TASK-0003
TASK-0006 (Zod)                → ejecutar tras TASK-0005 (comparte route handlers)
TASK-0008 (headers)            → independiente, ejecutar en paralelo con TASK-0001
─────────────────────────────────────────────────────────
→ GATE-CADDY-001 + GATE-TS-001 + GATE-SEC-001 + GATE-AUTH-001 + GATE-OSS-001
→ GATE-PROD-001 (primer despliegue)
```

---

*Este documento es el plan de implementación canónico para AncloraVisionFlow. Toda tarea referencia REQ-IDs de REQUIREMENTS.md y DES-IDs de DESIGN.md. Las tareas marcadas `[BLOQ]` no pueden iniciarse sin la aprobación humana del gate correspondiente. El `commit` agent debe usar este documento para verificar trazabilidad antes de cada commit.*
