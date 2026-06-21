# REQUIREMENTS — AncloraVisionFlow
**Versión:** 1.0.0 | **Fecha:** 2026-06-21 | **Estado:** BORRADOR APROBABLE
**Equipo autor:** Product Strategist · Staff Architect · Security/AI Governance · UX/UI Lead · DevOps · QA Lead · Ecosystem Integration Architect · OSS Evaluator

> **Convenciones de evidencia**
> - `[VERIFICADO]` — observado directamente en el repositorio
> - `[INFERENCIA]` — deducido con alta confianza del código o contrato Bóveda
> - `[PROPUESTA]` — nuevo requisito no implementado aún
> - `[DECISIÓN PENDIENTE]` — requiere aprobación humana antes de implementar
> - `[NO VERIFICADO]` — afirmación sin evidencia directa en el repo actual

---

## 1. Visión y Contexto

AncloraVisionFlow es la herramienta interna de diseño visual de soluciones del ecosistema Anclora Group. Transforma ideas, problemas y oportunidades en propuestas estructuradas, trazables y exportables, conectando los recursos del ecosistema (apps, capacidades, stack) con un motor de IA que propone, nunca actúa.

**Principio rector:** El modelo propone. Una persona autorizada revisa, aprueba y confirma cualquier acción operativa relevante.

---

## 2. Alcance de Requisitos

| Familia | Prefijo | Cobertura |
|---|---|---|
| Identidad y Control de Acceso | REQ-AUTH | Autenticación, RBAC, workspace |
| Mapas Visuales | REQ-MAP | CRUD, canvas, layout, paletas |
| Propuestas de Solución | REQ-PROP | Ciclo propuesta → aprobación → handoff |
| Motor IA | REQ-AI | Generación, prompt governance, límites |
| Catálogo del Ecosistema | REQ-CAT | Gestión de AncloraAppRecord, importaciones |
| Integraciones Ecosistema | REQ-ECOSYSTEM | Nexus, SyncXML, otros |
| Open Source First | REQ-OSS | Política tecnológica |
| Seguridad y Privacidad | REQ-SEC | OWASP, proxy, datos sensibles |
| Experiencia de Usuario | REQ-UX | Accesibilidad, i18n, responsive |
| Estados y Aprobaciones | REQ-GATE | Human-in-the-loop gates |
| Calidad y Observabilidad | REQ-QA | Tests, CI, logs |

---

## 3. Identidad y Control de Acceso (REQ-AUTH)

### REQ-AUTH-001 · Autenticación obligatoria
**Prioridad:** CRÍTICA | **Fase:** 0
Todo acceso a rutas `/api/**` y a la interfaz de VisionBoard debe requerir sesión autenticada válida.
- `next-auth 4.24.11` está declarado en `package.json` `[VERIFICADO]` pero no está configurado ni wired en ninguna ruta API `[VERIFICADO — ningún route.ts importa getServerSession]`.
- Acción requerida: implementar `getServerSession()` en middleware Next.js y en todas las rutas API antes de cualquier lógica de negocio.
- **GATE-AUTH-001:** la implementación de auth debe ser aprobada por el responsable de seguridad antes de merge a main.

### REQ-AUTH-002 · Workspace lógico
**Prioridad:** ALTA | **Fase:** 1
Cada recurso persistido (`VisionMapRecord`, `AncloraAppRecord`) debe pertenecer a un workspace.
- El modelo `VisionMapRecord` actual no tiene campo `userId`, `ownerId` ni `workspaceId` `[VERIFICADO]`.
- El modelo `AncloraAppRecord` tampoco tiene campos de propiedad `[VERIFICADO]`.
- Acción requerida: migración de esquema para añadir `workspaceId` y `ownerId` a ambos modelos.
- **GATE-DB-001:** toda migración de esquema debe pasar revisión de `migration-reviewer` y aprobación humana.

### REQ-AUTH-003 · Roles mínimos
**Prioridad:** ALTA | **Fase:** 1
El sistema debe soportar al menos dos roles:
- `viewer`: puede ver mapas del workspace, no puede generar ni modificar.
- `editor`: puede crear, editar y exportar mapas; puede proponer handoffs.
- `admin`: gestiona catálogo, importaciones, políticas LLM y configuración de workspace.
- `[PROPUESTA]` — no existe RBAC en el código actual.

### REQ-AUTH-004 · Política LLM por workspace
**Prioridad:** ALTA | **Fase:** 1
Ningún proveedor LLM puede utilizarse sin una política de workspace registrada que especifique: proveedor permitido, modelo, límite de tokens/mes, datos que pueden enviarse.
- `z-ai-web-dev-sdk 0.0.18` se usa sin ninguna capa de gobernanza `[VERIFICADO en /api/vision/generate/route.ts]`.
- **DEC-OSS-001 [DECISIÓN PENDIENTE]:** evaluar si `z-ai-web-dev-sdk` cumple los requisitos de auditabilidad y self-hosting de la política OSS First, o si debe reemplazarse por un cliente directo de Anthropic/OpenAI OSS.

---

## 4. Mapas Visuales (REQ-MAP)

### REQ-MAP-001 · Nodos del mapa
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
El mapa visual soporta 11 categorías de nodos: `idea`, `objective`, `step`, `risk`, `tool`, `cost`, `priority`, `next`, `kpi`, `stakeholder`, `timeline`. `[VERIFICADO en src/lib/vision-map.ts:3-14]`

### REQ-MAP-002 · Layout radial
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
El motor de layout radial (`layoutVisionMap`) posiciona el nodo `idea` en el centro y distribuye el resto en arcos por categoría sobre un canvas de 2400×1600px por defecto. `[VERIFICADO en src/lib/vision-map.ts:261-317]`

### REQ-MAP-003 · Conexiones automáticas
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
`autoConnect()` genera conexiones etiquetadas entre nodos: idea→objectives, objectives→steps/risks/costs/kpis/timelines, steps→next, tools→steps. `[VERIFICADO en src/lib/vision-map.ts:328-376]`

### REQ-MAP-004 · Paletas visuales
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
Tres paletas disponibles: `anclora` (mint + navy), `nexus` (gold + deep indigo), `premium` (rosa coral + violeta). `[VERIFICADO en src/lib/vision-map.ts:88-140]`

### REQ-MAP-005 · Persistencia CRUD
**Prioridad:** CORE | **Fase:** 0 (ya implementado, incompleto)
Los mapas se persisten en `VisionMapRecord` (SQLite via Prisma) con campos: title, idea, summary, appsJson, nodesJson, connectionsJson, palette, tags, starred. `[VERIFICADO en prisma/schema.prisma:21-37]`
- **Deficiencia:** falta `userId`/`workspaceId` — ver REQ-AUTH-002.

### REQ-MAP-006 · Exportación PDF y Markdown
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
El mapa puede exportarse a PDF via `html2canvas + jspdf` y a Markdown via `src/lib/markdown-export.ts`. `[VERIFICADO en package.json:57,62 y src/lib/markdown-export.ts]`

### REQ-MAP-007 · Drag-and-drop de nodos
**Prioridad:** MEDIA | **Fase:** 1
Los nodos pueden reposicionarse manualmente via `@dnd-kit/core`. `[VERIFICADO en package.json:16-18]`

### REQ-MAP-008 · Etiquetas y favoritos
**Prioridad:** MEDIA | **Fase:** 0 (ya implementado)
`VisionMapRecord` tiene campos `tags` (comma-separated) y `starred` (boolean). `[VERIFICADO en prisma/schema.prisma:30-31]`

### REQ-MAP-009 · Historial de versiones
**Prioridad:** MEDIA | **Fase:** 2
`[PROPUESTA]` Los mapas deben soportar historial de revisiones (al menos 5 versiones). No implementado actualmente. Requiere modelo `VisionMapVersion`.

### REQ-MAP-010 · Canvas responsivo
**Prioridad:** ALTA | **Fase:** 1
El canvas debe ser funcional en tablets (mínimo 768px de ancho) con controles de zoom y pan táctiles. `[PROPUESTA]` — verificar implementación actual en VisionBoard.tsx.

---

## 5. Propuestas de Solución (REQ-PROP)

### REQ-PROP-001 · Ciclo de vida de propuesta
**Prioridad:** ALTA | **Fase:** 1
Una propuesta de solución tiene estados: `draft` → `review` → `approved` → `handed_off` → `archived`. Las transiciones `approved` y `handed_off` requieren acción humana explícita. `[PROPUESTA]`

### REQ-PROP-002 · Metadatos de propuesta
**Prioridad:** ALTA | **Fase:** 1
Cada propuesta aprobada debe incluir: título, descripción ejecutiva, mapa visual asociado, apps Anclora sugeridas, estimación de coste total, timeline resumen, stakeholders, KPIs objetivo, responsable propuesta, fecha aprobación, revisor. `[PROPUESTA]`

### REQ-PROP-003 · Prohibición de escrituras automáticas
**Prioridad:** CRÍTICA | **Fase:** 0
La IA no puede, sin transición explícita de estado y aprobación humana:
- crear tareas en Anclora Nexus
- modificar sistemas externos
- crear, editar, cancelar o confirmar reservas (Anclora Private Estates)
- publicar catálogos o documentos
- ejecutar automatizaciones irreversibles
`[CONTRATO BÓVEDA — preservación literal]`

### REQ-PROP-004 · Botón de handoff a Nexus
**Prioridad:** ALTA | **Fase:** 1
Un editor autenticado puede solicitar handoff de una propuesta aprobada a Anclora Nexus. El sistema genera un borrador de tarea Nexus (JSON estructurado) para revisión humana. Solo tras confirmación explícita, el borrador se envía a la API de Nexus.
- **GATE-NEXUS-001:** el formato del borrador Nexus debe ser validado contra el contrato Bóveda antes de activar el botón.

### REQ-PROP-005 · Propuestas no pueden operar sobre reservas
**Prioridad:** CRÍTICA | **Fase:** 0
VisionFlow no podrá crear, modificar, cancelar o confirmar reservas de Anclora Private Estates sin: contrato verificado, autorización humana explícita y auditoría completa. `[CONTRATO BÓVEDA — preservación literal]`

---

## 6. Motor IA (REQ-AI)

### REQ-AI-001 · Generación de mapa visual
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
`POST /api/vision/generate` recibe `{ idea: string }` y retorna un `VisionMap` completo generado via LLM. `[VERIFICADO en src/app/api/vision/generate/route.ts]`

### REQ-AI-002 · Prompt governance
**Prioridad:** ALTA | **Fase:** 1
El system prompt del motor IA debe:
- estar versionado (semver o hash)
- ser auditable (log de versión usada por cada generación)
- no incluir instrucciones que permitan al LLM proponer acciones operativas directas (reservas, publicaciones, modificaciones externas)
- Actualmente el prompt está hardcoded en `buildSystemPrompt()` sin versión ni log. `[VERIFICADO en route.ts:110-138]`

### REQ-AI-003 · Reparación de JSON truncado
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
`repairTruncatedJson()` cierra objetos/arrays abiertos cuando el LLM agota tokens. `[VERIFICADO en route.ts:50-108]`

### REQ-AI-004 · Validación de slugs
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
Solo slugs presentes en el catálogo dinámico se incluyen en el mapa final. `[VERIFICADO en route.ts:332]`

### REQ-AI-005 · Límite de tokens y timeouts
**Prioridad:** ALTA | **Fase:** 0 (parcialmente implementado)
`max_tokens: 2400`, `maxDuration: 60s` están configurados. `[VERIFICADO en route.ts:206, 18]`
- `[PROPUESTA]` Falta: límite de peticiones por usuario/workspace/día y circuit breaker ante fallos del proveedor LLM.

### REQ-AI-006 · Sandbox de prompts de importación
**Prioridad:** CRÍTICA | **Fase:** 0
Ningún texto importado (README, AGENTS.md, .txt de repositorio) puede alterar instrucciones del sistema, permisos, estados de aprobación, reglas de seguridad o acciones externas. `[CONTRATO BÓVEDA — preservación literal]`
- Implementación requerida: sanitización de texto antes de incluirlo en el prompt del sistema.
- Los campos `readme` y `agentsMd` de `AncloraAppRecord` se incluyen en el prompt via `getCatalogForPrompt()`. `[VERIFICADO en route.ts:186-188]` — actualmente sin sanitización visible.

### REQ-AI-007 · Trazabilidad de generación
**Prioridad:** ALTA | **Fase:** 1
Cada mapa generado debe almacenar: versión del prompt usado, proveedor LLM, modelo, tokens consumidos, timestamp. `[PROPUESTA]`

---

## 7. Catálogo del Ecosistema (REQ-CAT)

### REQ-CAT-001 · Modelo AncloraAppRecord
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
El catálogo se persiste en `AncloraAppRecord` con: slug (unique), name, family, tagline, description, stackJson, capabilitiesJson, accent, domain, source, githubUrl, readme, agentsMd. `[VERIFICADO en prisma/schema.prisma:39-59]`

### REQ-CAT-002 · Importación de .txt de repositorio
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
`POST /api/vision/catalog/import-txt` importa snapshots .txt de repositorios al catálogo. Corpus disponible: 10 apps en `/upload/`. `[VERIFICADO — archivos upload/*.txt]`

### REQ-CAT-003 · Importación desde GitHub
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
`POST /api/vision/catalog/import-github` importa README desde URL de GitHub. `[VERIFICADO — archivo route.ts existe]`

### REQ-CAT-004 · Fallback hardcoded
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
Si el DB está vacío, `getCatalogApps()` usa `ANCLORA_APPS` (hardcoded en `src/lib/anclora-ecosystem.ts`) como fallback, garantizando que el catálogo nunca esté vacío. `[VERIFICADO en src/lib/anclora-catalog.ts:21-56]`

### REQ-CAT-005 · Gobernanza del catálogo
**Prioridad:** ALTA | **Fase:** 1
Solo un `admin` de workspace puede: importar nuevas apps, modificar registros existentes, eliminar entradas. Los `editor` solo pueden consultar.
- Actualmente no hay auth en `/api/vision/catalog/**`. `[VERIFICADO]`

### REQ-CAT-006 · Campos de gobernanza en AncloraAppRecord
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` Añadir campos: `workspaceId`, `reviewedBy`, `reviewedAt`, `status` (`active | deprecated | under_review`), `commitSha`.

### REQ-CAT-007 · Límite de contexto agentsMd
**Prioridad:** ALTA | **Fase:** 0 (parcialmente implementado)
El campo `agentsMd` se trunca a 200 caracteres en el prompt. `[VERIFICADO en route.ts:187]`
- `[PROPUESTA]` El truncado debe ser configurable por workspace y documentado en la gobernanza del prompt.

---

## 8. Integraciones del Ecosistema (REQ-ECOSYSTEM)

### REQ-ECOSYSTEM-001 · Anclora Nexus — handoff de tareas
**Prioridad:** ALTA | **Fase:** 1
VisionFlow puede generar borradores de tareas para Anclora Nexus. El formato del borrador debe respetar el contrato de la API Nexus (validado desde Bóveda: `/mnt/c/Users/antonio.ballesterosa/Desktop/Proyectos/Boveda-Anclora/contracts/`). `[INFERENCIA desde PDF Documento Maestro]`
- **GATE-NEXUS-001:** contrato Nexus debe estar firmado en Bóveda antes de activar el endpoint de handoff.

### REQ-ECOSYSTEM-002 · Anclora Nexus — solo propuesta, no ejecución
**Prioridad:** CRÍTICA | **Fase:** 0
VisionFlow puede proponer tareas Nexus; jamás puede crearlas, modificarlas ni cancelarlas directamente sin aprobación humana explícita en interfaz. `[CONTRATO BÓVEDA]`

### REQ-ECOSYSTEM-003 · Anclora SyncXML — exportación estructurada
**Prioridad:** MEDIA | **Fase:** 2
Los mapas aprobados pueden exportarse como XML estructurado compatible con Anclora SyncXML para sincronización con sistemas externos. `[INFERENCIA desde Documento Maestro]`

### REQ-ECOSYSTEM-004 · Anclora SyncXML — solo lectura
**Prioridad:** CRÍTICA | **Fase:** 2
La integración con SyncXML es de solo lectura desde VisionFlow: VisionFlow exporta datos; SyncXML no escribe sobre VisionFlow sin consentimiento explícito. `[PROPUESTA con base en política BÓVEDA]`

### REQ-ECOSYSTEM-005 · Corpus de apps del ecosistema
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
El corpus de 10 apps del ecosistema (Nexus, Advisor AI, SyncXML, FileStudio, DataLab, ContentGeneratorAI, EnergyScan, PrivateEstates, PrivateEstatesLanding, Synergi) está disponible en `/upload/*.txt`. `[VERIFICADO]`

### REQ-ECOSYSTEM-006 · Prohibición de prompt injection via importaciones
**Prioridad:** CRÍTICA | **Fase:** 0
Ningún texto importado puede alterar instrucciones del sistema, permisos, estados de aprobación, reglas de seguridad o acciones externas. `[CONTRATO BÓVEDA — preservación literal]`
Acción: sanitizar `readme` y `agentsMd` antes de incluirlos en cualquier prompt LLM.

### REQ-ECOSYSTEM-007 · Otras apps Anclora — modo consulta
**Prioridad:** BAJA | **Fase:** 3
VisionFlow puede consultar datos read-only de otras apps Anclora (Synergi, DataLab) para enriquecer propuestas. Requiere contrato Bóveda por integración. `[PROPUESTA]`

---

## 9. Integraciones SyncXML (REQ-SYNCXML)

### REQ-SYNCXML-001 · Esquema de exportación
**Prioridad:** MEDIA | **Fase:** 2
`[PROPUESTA]` El esquema XML de exportación debe incluir: metadatos del mapa (id, título, fecha, autor), nodos con todos sus campos, conexiones, apps referenciadas, estado de aprobación.

### REQ-SYNCXML-002 · Validación de esquema
**Prioridad:** MEDIA | **Fase:** 2
`[PROPUESTA]` El XML exportado debe validarse contra un XSD/Relax NG antes de enviarse a SyncXML.

### REQ-SYNCXML-003 · Registro de exportaciones
**Prioridad:** MEDIA | **Fase:** 2
`[PROPUESTA]` Cada exportación a SyncXML debe quedar registrada con: timestamp, usuario, mapa exportado, hash del payload.

### REQ-SYNCXML-004 · Confirmación previa
**Prioridad:** ALTA | **Fase:** 2
`[PROPUESTA]` El usuario debe confirmar explícitamente antes de cualquier exportación a SyncXML, con preview del payload en pantalla.

---

## 10. Open Source First (REQ-OSS)

### REQ-OSS-001 · Preferencia por tecnologías OSS
**Prioridad:** ALTA | **Fase:** 0 (ongoing)
Toda decisión técnica nueva debe preferir alternativas OSS, self-hostable y reversibles. `[POLÍTICA BÓVEDA]`

### REQ-OSS-002 · Evaluación de z-ai-web-dev-sdk
**Prioridad:** ALTA | **Fase:** 0
**DEC-OSS-001 [DECISIÓN PENDIENTE]:** `z-ai-web-dev-sdk 0.0.18` es una dependencia no documentada públicamente `[VERIFICADO — no está en npm public registry con docs]`. Debe evaluarse si:
- Ofrece auditabilidad de llamadas LLM
- Permite self-hosting o routing local
- Tiene alternativa OSS equivalente (sdk oficial Anthropic, openai npm, etc.)

### REQ-OSS-003 · Proveedor LLM documentado
**Prioridad:** ALTA | **Fase:** 1
El proveedor LLM usado por `z-ai-web-dev-sdk` debe estar documentado en la configuración del workspace. Actualmente es opaco. `[INFERENCIA — el SDK oculta el provider]`

### REQ-OSS-004 · SQLite como base de datos
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
SQLite vía Prisma es compatible con el principio OSS/self-hostable. `[VERIFICADO]`

### REQ-OSS-005 · Stack de UI OSS
**Prioridad:** CORE | **Fase:** 0 (ya implementado)
Next.js, React, Tailwind v4, Radix UI, shadcn, Framer Motion son todos OSS. `[VERIFICADO en package.json]`

### REQ-OSS-006 · Sin lock-in en exportaciones
**Prioridad:** ALTA | **Fase:** 1
Los formatos de exportación (PDF, Markdown, futuro XML) deben ser estándar abierto, no propietarios.

---

## 11. Seguridad y Privacidad (REQ-SEC)

### REQ-SEC-001 · Eliminación del proxy dinámico Caddy
**Prioridad:** CRÍTICA | **Fase:** 0
El `Caddyfile` actual permite redirigir tráfico a cualquier puerto local via `?XTransformPort=<n>` sin autenticación. `[VERIFICADO en Caddyfile:7]`
Esto permite: SSRF, acceso a servicios internos no expuestos, port pivoting.
Acción requerida: eliminar el bloque `@transform_port_query` antes de cualquier despliegue a producción.
- **GATE-CADDY-001:** la eliminación del proxy dinámico es condición bloqueante para el despliegue.

### REQ-SEC-002 · Eliminar ignoreBuildErrors
**Prioridad:** ALTA | **Fase:** 0
`typescript.ignoreBuildErrors: true` en `next.config.ts` permite que el build de producción incluya código TypeScript con errores de tipo. `[VERIFICADO]`
Acción: corregir todos los errores TS y establecer `ignoreBuildErrors: false`.
- **GATE-TS-001:** el build debe pasar sin errores TS antes de despliegue.

### REQ-SEC-003 · Autenticación en todas las rutas API
**Prioridad:** CRÍTICA | **Fase:** 0
Ninguna ruta API está protegida actualmente. `[VERIFICADO — ningún route.ts tiene getServerSession o middleware de auth]`
Ver REQ-AUTH-001.

### REQ-SEC-004 · Validación de entrada con Zod
**Prioridad:** ALTA | **Fase:** 0
Toda entrada a rutas API debe validarse con Zod antes de procesarse. `[PROPUESTA — Zod está en deps pero no se usa en las rutas verificadas]`

### REQ-SEC-005 · Rate limiting
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` El endpoint `/api/vision/generate` debe tener rate limiting por usuario/IP (máx N peticiones/minuto) para prevenir abuso y costes LLM descontrolados.

### REQ-SEC-006 · Sanitización de contenido importado
**Prioridad:** CRÍTICA | **Fase:** 0
Ver REQ-ECOSYSTEM-006 y REQ-AI-006. Los campos `readme` y `agentsMd` deben ser sanitizados (strip de delimitadores de sistema prompt, instrucciones de override, patrones de inyección) antes de incluirse en cualquier prompt LLM.

### REQ-SEC-007 · No exponer errores internos al cliente
**Prioridad:** ALTA | **Fase:** 0
Los errores de servidor (stack traces, detalles de DB, mensajes LLM) no deben incluirse en respuestas de error al cliente.
- `[INFERENCIA]` La ruta `generate` retorna `message` del error: `{ error: ...err.message }`. `[VERIFICADO en route.ts:350]` — puede exponer detalles internos.

### REQ-SEC-008 · Secretos fuera del repo
**Prioridad:** CRÍTICA | **Fase:** 0
`DATABASE_URL` usa `env()` de Prisma `[VERIFICADO en schema.prisma:9]`. Verificar que ninguna clave de API (z-ai-web-dev-sdk, LLM provider) esté hardcodeada.
- **GATE-SEC-001:** escaneo de secretos obligatorio antes de cada push a repo remoto.

### REQ-SEC-009 · Headers de seguridad HTTP
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` Configurar en `next.config.ts`: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

### REQ-SEC-010 · Auditoría de acciones sensibles
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` Todas las acciones de handoff (Nexus, SyncXML), cambios de estado de propuesta y modificaciones de catálogo deben quedar en un log de auditoría inmutable (append-only).

---

## 12. Experiencia de Usuario (REQ-UX)

### REQ-UX-001 · Accesibilidad WCAG 2.1 AA
**Prioridad:** ALTA | **Fase:** 1
Todos los controles interactivos deben tener: `aria-label`, contraste ≥ 4.5:1, hit target ≥ 44×44px, navegación teclado completa, foco visible. `[POLÍTICA BÓVEDA]`

### REQ-UX-002 · Internacionalización
**Prioridad:** MEDIA | **Fase:** 1
`next-intl 4.3.4` está en deps `[VERIFICADO]`. La interfaz debe soportar ES/EN como mínimo. El system prompt del LLM genera en español `[VERIFICADO en route.ts:111]`.

### REQ-UX-003 · Tema oscuro (dark-first)
**Prioridad:** ALTA | **Fase:** 0 (ya implementado)
Las paletas de VisionFlow son dark-first (backgrounds: `#0a0f1f`, `#0F1629`, `#1A0E1F`). `[VERIFICADO en vision-map.ts:93-96]`
`next-themes 0.4.6` gestiona el toggle. `[VERIFICADO en package.json:65]`

### REQ-UX-004 · Animaciones respetuosas de prefers-reduced-motion
**Prioridad:** ALTA | **Fase:** 1
`framer-motion 12.23.2` está disponible `[VERIFICADO]`. Todas las animaciones deben respetar `prefers-reduced-motion`. `[PROPUESTA — verificar implementación actual]`

### REQ-UX-005 · Feedback en operaciones LLM
**Prioridad:** ALTA | **Fase:** 0 (ya implementado parcialmente)
El tiempo de respuesta del LLM se loguea (`elapsed`). `[VERIFICADO en route.ts:209]`
`[PROPUESTA]` La UI debe mostrar estado de carga con indicador de progreso y timeout visible al usuario.

### REQ-UX-006 · Diseño responsive
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` VisionBoard debe funcionar en viewport ≥ 768px con controles adaptados a touch.

### REQ-UX-007 · Estado vacío y onboarding
**Prioridad:** MEDIA | **Fase:** 1
`[PROPUESTA]` Primera visita sin mapas debe mostrar un estado vacío con CTA claro para crear el primer mapa y ejemplos de ideas.

---

## 13. Estados y Aprobaciones Humanas (REQ-GATE)

### REQ-GATE-001 · Gates de aprobación humana
**Prioridad:** CRÍTICA | **Fase:** 0
Las siguientes acciones requieren aprobación humana explícita antes de ejecutarse:

| ID Gate | Acción | Responsable |
|---|---|---|
| GATE-AUTH-001 | Implementación de auth (next-auth) en producción | Responsable de Seguridad |
| GATE-DB-001 | Migración de esquema (userId, workspaceId) | Staff Architect + DBA |
| GATE-CADDY-001 | Eliminación del proxy dinámico XTransformPort | DevOps + Seguridad |
| GATE-TS-001 | Build TS sin errores (ignoreBuildErrors: false) | QA Lead |
| GATE-SEC-001 | Escaneo de secretos limpio antes de push | Security Engineer |
| GATE-NEXUS-001 | Activación del endpoint de handoff Nexus | Product Strategist + Nexus Owner |
| GATE-OSS-001 | Decisión sobre z-ai-web-dev-sdk (mantener vs reemplazar) | OSS Evaluator + CTO |
| GATE-PROD-001 | Primer despliegue a producción | Todos los leads |

### REQ-GATE-002 · Sin automatizaciones irreversibles sin gate
**Prioridad:** CRÍTICA | **Fase:** 0
Ningún agente de IA, script de CI o automatización puede ejecutar acciones irreversibles (DELETE de datos, publicaciones externas, handoffs) sin un gate de aprobación humana registrado. `[POLÍTICA BÓVEDA]`

---

## 14. Calidad y Observabilidad (REQ-QA)

### REQ-QA-001 · Tests unitarios e integración
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` No existe ningún test en el repositorio actual `[VERIFICADO — no hay archivos .test.ts/.spec.ts]`. El `package.json` no tiene script `test` `[VERIFICADO]`.
Stack requerido: Vitest + React Testing Library (conforme a convenciones del proyecto).

### REQ-QA-002 · Cobertura mínima
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` Cobertura objetivo: ≥ 80% en `src/lib/`, ≥ 60% en componentes críticos (VisionBoard, CatalogDialog), 100% en funciones de validación/sanitización.

### REQ-QA-003 · CI/CD
**Prioridad:** ALTA | **Fase:** 1
`[PROPUESTA]` No existe configuración CI `[VERIFICADO — no hay .github/workflows/ ni similar]`. Implementar pipeline: lint → typecheck → test → build → deploy.

### REQ-QA-004 · Logging estructurado
**Prioridad:** MEDIA | **Fase:** 1
`[PROPUESTA]` Reemplazar `console.log/error` dispersos por logger estructurado (ej. `pino` o `winston`) con niveles configurables por entorno.

### REQ-QA-005 · Health check endpoint
**Prioridad:** MEDIA | **Fase:** 1
`[PROPUESTA]` `GET /api/health` que retorne estado de DB, versión de build y estado del proveedor LLM.

---

## 15. Decisiones Pendientes de Aprobación Humana

| ID | Descripción | Responsable | Fase | Bloqueante |
|---|---|---|---|---|
| DEC-OSS-001 | Mantener z-ai-web-dev-sdk vs cliente OSS directo | OSS Evaluator + CTO | 0 | Sí — bloquea REQ-AI-002 |
| DEC-AUTH-001 | Provider next-auth: credentials vs OAuth Anclora | Responsable Seguridad | 0 | Sí — bloquea REQ-AUTH-001 |
| DEC-DB-001 | Migración SQLite a PostgreSQL para Fase 2 (RAG/embeddings) | Staff Architect | 1 | No — decisión pre-Fase 2 |
| DEC-NEXUS-001 | Contrato API Nexus para handoff (endpoint, auth, payload) | Nexus Owner + Product | 1 | Sí — bloquea REQ-ECOSYSTEM-001 |
| DEC-SYNC-001 | Esquema XML SyncXML y protocolo de sincronización | SyncXML Owner | 2 | Sí — bloquea REQ-SYNCXML-001 |
| DEC-COLLAB-001 | Modelo de colaboración en tiempo real (Fase 3): CRDT vs locking | Staff Architect | 3 | No |
| DEC-PREMIUM-001 | Features de tier premium y modelo de monetización | Product Strategist | 3 | No |

---

## 16. Trazabilidad Rápida

| Requisito | Archivo/Línea en Repo | Estado |
|---|---|---|
| REQ-MAP-001 | `src/lib/vision-map.ts:3-14` | VERIFICADO |
| REQ-MAP-002 | `src/lib/vision-map.ts:261-317` | VERIFICADO |
| REQ-MAP-003 | `src/lib/vision-map.ts:328-376` | VERIFICADO |
| REQ-MAP-004 | `src/lib/vision-map.ts:88-140` | VERIFICADO |
| REQ-MAP-005 | `prisma/schema.prisma:21-37` | VERIFICADO (parcial) |
| REQ-CAT-001 | `prisma/schema.prisma:39-59` | VERIFICADO |
| REQ-CAT-002 | `src/app/api/vision/catalog/import-txt/route.ts` | VERIFICADO |
| REQ-CAT-004 | `src/lib/anclora-catalog.ts:21-56` | VERIFICADO |
| REQ-AI-001 | `src/app/api/vision/generate/route.ts` | VERIFICADO |
| REQ-AI-003 | `src/app/api/vision/generate/route.ts:50-108` | VERIFICADO |
| REQ-AI-005 | `src/app/api/vision/generate/route.ts:206,18` | VERIFICADO |
| REQ-SEC-001 | `Caddyfile:3-13` | VERIFICADO — RIESGO CRÍTICO |
| REQ-SEC-002 | `next.config.ts:6-8` | VERIFICADO — RIESGO CRÍTICO |
| REQ-SEC-003 | Todos los `route.ts` | VERIFICADO — SIN AUTH |
| REQ-OSS-004 | `prisma/schema.prisma:8-10` | VERIFICADO |

---

*Este documento es la fuente canónica de requisitos para AncloraVisionFlow v1.x. Toda tarea de implementación debe referenciar al menos un REQ-ID. Toda decisión de arquitectura debe referenciar al menos un REQ-ID y un DEC-ID o GATE-ID.*
