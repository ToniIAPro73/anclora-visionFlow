# CHANGELOG — ANCLORA VISIONFLOW CORE

**Registro de cambios arquitectónicos en core database, API y SDD**

---

## [0.1.0] — 2026-06-21 — SDD Bootstrap + Spec Inicial

**Status:** ✅ RELEASED (branch: development)
**Criticality:** ALTA

### Scope delivered
- Inicialización del directorio `sdd/` con estructura canónica (core, features, contracts, _templates)
- Creación de `constitution-canonical.md` v1.0.0
- Creación de `product-spec-v0.md` con estado actual de capacidades y riesgos
- Creación de specs completas en `docs/specs/anclora-visionflow/`: REQUIREMENTS.md, DESIGN.md, TASK.md
- Pipeline CI/CD con GitHub Actions (ci.yml + 3 promote workflows)
- Ramas: development, staging, production creadas desde main

### SDD Changes
- Añadido: `sdd/core/constitution-canonical.md`
- Añadido: `sdd/core/product-spec-v0.md`
- Añadido: `sdd/core/INDEX.md`
- Añadido: `sdd/core/CHANGELOG.md`
- Añadido: `sdd/features/FEATURES.md`
- Añadido: `sdd/contracts/VISIONFLOW-ECOSYSTEM-CONTRACT.md`
- Añadido: `sdd/_templates/{spec,prompt,skill}-feature-template.md`
- Añadido: `docs/specs/anclora-visionflow/{REQUIREMENTS,DESIGN,TASK}.md`

### Riesgos identificados (pendientes Fase 0)
- RISK-CADDY-001: Proxy XTransformPort → GATE-CADDY-001
- RISK-AUTH-001: Sin auth en rutas API → GATE-AUTH-001
- RISK-SDK-001: z-ai-web-dev-sdk no OSS → GATE-OSS-001
- RISK-INJ-001: Sin sanitización de agentsMd → TASK-0004
