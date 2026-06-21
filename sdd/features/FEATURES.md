# FEATURES — ANCLORA VISIONFLOW

**Registro centralizado de features implementadas y en especificación**

---

## FASE 0 — Seguridad y Hardening (en progreso)

### Pendiente de implementación

| ID | Feature | Spec | Estado |
|---|---|---|---|
| AVF-SEC-001 | Eliminación proxy XTransformPort Caddy | TASK-0001 | TODO |
| AVF-SEC-002 | Corrección errores TypeScript (ignoreBuildErrors) | TASK-0002 | TODO |
| AVF-SEC-003 | Reemplazo z-ai-web-dev-sdk por SDK OSS | TASK-0003 | BLOCKED (DEC-OSS-001) |
| AVF-SEC-004 | Sanitización prompt injection en catálogo | TASK-0004 | TODO |
| AVF-SEC-005 | Autenticación next-auth en todas las rutas | TASK-0005 | BLOCKED (DEC-AUTH-001) |
| AVF-SEC-006 | Validación Zod en rutas POST/PUT | TASK-0006 | TODO |
| AVF-SEC-007 | Escaneo de secretos + pre-commit hook | TASK-0007 | TODO |
| AVF-SEC-008 | Headers de seguridad HTTP (CSP, X-Frame-Options) | TASK-0008 | TODO |

---

## FASE 1 — Propuestas Gobernadas (planificada)

| ID | Feature | Spec | Estado |
|---|---|---|---|
| AVF-GOV-001 | Workspace + WorkspaceMember + RBAC | TASK-1001, TASK-1002 | TODO |
| AVF-GOV-002 | Ciclo de vida de propuesta (estados + transiciones) | TASK-1003 | TODO |
| AVF-GOV-003 | Handoff a Anclora Nexus con confirmación humana | TASK-1004 | BLOCKED (DEC-NEXUS-001) |
| AVF-GOV-004 | Política LLM por workspace | TASK-1005 | TODO |
| AVF-GOV-005 | Versionado y trazabilidad del prompt | TASK-1006 | DONE |
| AVF-GOV-006 | Rate limiting en endpoint de generación | TASK-1007 | TODO |
| AVF-GOV-007 | Suite de tests (Vitest + RTL) | TASK-1008 | TODO |
| AVF-GOV-008 | CI/CD con GitHub Actions | TASK-1009 | TODO |
| AVF-GOV-009 | Accesibilidad WCAG 2.1 AA | TASK-1010 | TODO |
| AVF-GOV-010 | Health check endpoint | TASK-1011 | TODO |
| AVF-GOV-011 | Internacionalización ES/EN | TASK-1012 | TODO |

---

## FASE 2 — IA Avanzada y Async (planificada)

| ID | Feature | Spec | Estado |
|---|---|---|---|
| AVF-AI-001 | RAG sobre catálogo con embeddings | TASK-2001 | TODO |
| AVF-AI-002 | Jobs asíncronos para generación | TASK-2002 | TODO |
| AVF-SYNC-001 | Exportación a SyncXML | TASK-2003 | BLOCKED (DEC-SYNC-001) |
| AVF-MAP-001 | Historial de versiones de mapas | TASK-2004 | TODO |

---

## FASE 3 — Colaboración y Premium (planificada)

| ID | Feature | Spec | Estado |
|---|---|---|---|
| AVF-COL-001 | Comentarios en propuestas | TASK-3001 | TODO |
| AVF-COL-002 | Notificaciones de cambio de estado | TASK-3002 | TODO |
| AVF-COL-003 | Edición colaborativa básica | TASK-3003 | BLOCKED (DEC-COLLAB-001) |
| AVF-PRE-001 | Tier premium | TASK-3004 | BLOCKED (DEC-PREMIUM-001) |

---

## Decisiones Pendientes de Aprobación Humana

| DEC | Descripción | Bloqueante para |
|---|---|---|
| DEC-OSS-001 | SDK OSS para LLM (reemplazar z-ai-web-dev-sdk) | AVF-SEC-003 |
| DEC-AUTH-001 | Provider next-auth (credentials vs OAuth) | AVF-SEC-005 |
| DEC-DB-001 | SQLite vs PostgreSQL para Fase 2 | AVF-AI-001 |
| DEC-NEXUS-001 | Contrato API Nexus para handoff | AVF-GOV-003 |
| DEC-SYNC-001 | Esquema XML SyncXML | AVF-SYNC-001 |
| DEC-COLLAB-001 | CRDT vs optimistic locking | AVF-COL-003 |
| DEC-PREMIUM-001 | Features premium y monetización | AVF-PRE-001 |
