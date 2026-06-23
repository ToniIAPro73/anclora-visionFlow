# Decision Register — AncloraVisionFlow Fase 0
**Fecha:** 2026-06-21 | **Última actualización:** 2026-06-23 (Fase 0 hardening)

| ID | Descripción | Responsable | Estado | Bloqueante para |
|---|---|---|---|---|
| DEC-OSS-001 | SDK OSS para LLM (reemplazar z-ai-web-dev-sdk) | OSS Evaluator + CTO | ✅ RESUELTO — `openai` npm (OpenRouter-compatible); z-ai-web-dev-sdk eliminado | — |
| DEC-AUTH-001 | Provider next-auth (credentials vs OAuth vs SSO) | Responsable Seguridad | ⏳ PENDIENTE | Fase 1 (F1-T1) |
| DEC-DB-001 | SQLite vs PostgreSQL para Fase 2 (RAG/embeddings) | Staff Architect | ✅ RESUELTO — PostgreSQL (Neon) desde inicio; SQLite abandonado en migración 20260622220704 | — |
| DEC-NEXUS-001 | Contrato API Nexus (endpoint, auth, payload) | Product + Nexus Owner | ⏳ PENDIENTE | TASK-1004 |
| DEC-SYNC-001 | Esquema XML SyncXML y protocolo | SyncXML Owner | ⏳ PENDIENTE | TASK-2003 |
| GATE-DB-001 | Implementación TASK-1001 aprobada con condiciones: workspace canónico `anclora-internal`, migración segura, sin auth/UI/externos | Staff Architect + DBA | ✅ APROBADO | TASK-1001 |

## Impacto en implementación actual
- DEC-OSS-001: TASK-0003 no iniciada. El endpoint /api/vision/generate sigue usando z-ai-web-dev-sdk (`ZAI.create()` en línea 195 de generate/route.ts).
- DEC-AUTH-001: TASK-0005 no iniciada. Las rutas API siguen sin autenticación. Riesgo CRÍTICO documentado en RISK-AUTH-001.
- Las demás decisiones no afectan a Fase 0.

## Contexto para DEC-OSS-001
`z-ai-web-dev-sdk@0.0.18` está publicado en npm pero su repositorio fuente no es públicamente verificable. El SDK envuelve llamadas LLM — cualquier cambio en su comportamiento afecta directamente al core de VisionFlow. Candidatos de reemplazo: `@anthropic-ai/sdk`, `openai` (compatible API). Requiere decisión antes de TASK-0003.

## Contexto para DEC-AUTH-001
next-auth 4.24.11 está declarado en package.json pero NO hay ningún archivo `[...nextauth]` wired, ni middleware de sesión, ni ninguna llamada a `getServerSession` en las rutas existentes. La decisión de provider bloquea el wiring completo.

## Contexto para GATE-DB-001

TASK-1001 queda autorizado solo como fundación de datos/gobernanza. Condiciones aplicadas:

- Workspace canónico `anclora-internal` sin aceptar `workspaceId` desde cliente.
- No se inventan usuarios, memberships, owners, approvers ni reviewers para histórico.
- `VisionMapRecord` y `AncloraAppRecord` quedan scoped por `workspaceId NOT NULL`.
- `AncloraAppRecord.reviewedById` es relación a `User` con `onDelete: SetNull`.
- No se modifica `REQUIREMENTS.md` ni `DESIGN.md`.
- No se toca Nexus, SyncXML, auth completa, UI de miembros ni handoffs externos.
