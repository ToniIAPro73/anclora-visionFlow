# PRODUCT SPEC v0 — AncloraVisionFlow
**Versión:** 0.1.0 | **Fecha:** 2026-06-21 | **Estado:** ACTIVO

---

## 1. Definición del Producto

AncloraVisionFlow es la herramienta interna de diseño visual de soluciones del ecosistema Anclora Group. Transforma ideas, problemas y oportunidades en propuestas estructuradas, trazables y exportables mediante un motor de IA asistido por el catálogo del ecosistema.

**No es:** un gestor de proyectos, un sistema de reservas, un CRM ni un ejecutor autónomo de tareas.

**Es:** una herramienta de ideación y propuesta, cuyo output es material para revisión humana y eventual handoff a los sistemas operativos del ecosistema.

---

## 2. Contexto v0

- **Fase activa:** Fase 0 (seguridad y hardening) + Fase 1 (propuestas gobernadas)
- **Usuarios:** equipo interno Anclora Group (workspace único inicial)
- **Entorno:** single-workspace, sin multitenancy activo aún
- **Stack verificado:** Next.js 16.1.1, React 19, Tailwind v4, Radix UI, Prisma 6.11.1 + SQLite, next-auth 4.24.11, next-intl 4.3.4, Framer Motion 12.23.2

---

## 3. Capacidades Core (v0)

| Capacidad | Estado | Referencia |
|---|---|---|
| Generación de mapa visual via LLM | ✅ Implementado | REQ-AI-001 |
| 11 categorías de nodos (idea, objective, step, risk, tool, cost, priority, next, kpi, stakeholder, timeline) | ✅ Implementado | REQ-MAP-001 |
| Layout radial automático | ✅ Implementado | REQ-MAP-002 |
| Conexiones automáticas entre nodos | ✅ Implementado | REQ-MAP-003 |
| 3 paletas visuales (anclora, nexus, premium) | ✅ Implementado | REQ-MAP-004 |
| Persistencia CRUD de mapas (SQLite) | ✅ Implementado (sin auth) | REQ-MAP-005 |
| Exportación PDF y Markdown | ✅ Implementado | REQ-MAP-006 |
| Catálogo de apps del ecosistema (DB + fallback hardcoded) | ✅ Implementado | REQ-CAT-001 |
| Importación de snapshots .txt de repositorios | ✅ Implementado | REQ-CAT-002 |
| Importación desde GitHub | ✅ Implementado | REQ-CAT-003 |
| Corpus de 10 apps del ecosistema | ✅ Disponible en /upload/ | REQ-ECOSYSTEM-005 |
| Autenticación (next-auth) | ❌ Pendiente — TASK-0005 | REQ-AUTH-001 |
| RBAC por workspace | ❌ Pendiente — TASK-1002 | REQ-AUTH-003 |
| Ciclo de vida de propuestas | ❌ Pendiente — TASK-1003 | REQ-PROP-001 |
| Handoff a Nexus | ❌ Pendiente — TASK-1004 | REQ-ECOSYSTEM-001 |

---

## 4. Riesgos Activos (Fase 0)

| ID | Descripción | Severidad | Gate |
|---|---|---|---|
| RISK-CADDY-001 | Proxy dinámico XTransformPort permite SSRF | CRÍTICA | GATE-CADDY-001 |
| RISK-TS-001 | ignoreBuildErrors:true permite TS errors en producción | ALTA | GATE-TS-001 |
| RISK-AUTH-001 | Ninguna ruta API está protegida | CRÍTICA | GATE-AUTH-001 |
| RISK-SDK-001 | z-ai-web-dev-sdk no es OSS verificable | ALTA | GATE-OSS-001 |
| RISK-INJ-001 | agentsMd incluido en prompts sin sanitizar | CRÍTICA | TASK-0004 |
| RISK-SCHEMA-001 | VisionMapRecord sin userId/workspaceId | ALTA | GATE-DB-001 |

---

## 5. Roadmap de Fases

```
Fase 0  → Seguridad y hardening (Caddy, TS, auth, SDK OSS, sanitización)
Fase 1  → Propuestas gobernadas: workspaces, RBAC, estados, handoff Nexus
Fase 2  → IA avanzada: RAG sobre catálogo, embeddings, async jobs, SyncXML
Fase 3  → Colaboración: multi-usuario, comentarios, notificaciones, premium
```

---

## 6. Documentos Canónicos

- `sdd/core/constitution-canonical.md` — norma suprema
- `docs/specs/anclora-visionflow/REQUIREMENTS.md` — requisitos completos
- `docs/specs/anclora-visionflow/DESIGN.md` — arquitectura y diseño
- `docs/specs/anclora-visionflow/TASK.md` — plan de implementación
- `sdd/features/FEATURES.md` — registro de features
