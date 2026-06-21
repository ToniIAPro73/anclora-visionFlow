---
name: feature-avf-<feature-slug>
description: "Implementación de feature <feature-name> (AVF-XXX-NNN) para AncloraVisionFlow."
---

# Skill — <feature-name>

## Lecturas obligatorias
1. `sdd/core/constitution-canonical.md`
2. `sdd/core/product-spec-v0.md`
3. `sdd/features/<feature-name>/spec-<feature-name>-vX.md`
4. `docs/specs/anclora-visionflow/REQUIREMENTS.md`
5. `docs/specs/anclora-visionflow/DESIGN.md`

## Instrucciones
- Implementar mínimo viable según spec. Sin features adicionales.
- Verificar rama: `feat/avf-xxx-<slug>` → development.
- No tocar otros módulos fuera del alcance del spec (§2 Alcance).
- Entregar: migración Prisma + validación Zod + tests Vitest + walkthrough en QA_REPORT.md.
- Dispatch obligatorio al finalizar: `code-reviewer` → `commit`.
- Si hay GATE-XXX en §7, documentar en GATE_FINAL.md antes de solicitar merge a staging.
