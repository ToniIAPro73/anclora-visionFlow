# AVF-CASE-001 — Real Estate Case Blueprint

**Version:** 1.0  
**Status:** Approved  
**Author:** Claude Sonnet 4.6  
**Date:** 2026-06-23  
**Feature Family:** real-estate  

## 1. Scope

This spec defines the Case domain for AncloraVisionFlow. A Case is a structured workflow unit for a real estate operation, from initial brief through evidence collection, status transitions, brief export, SDD generation, and handoff to Nexus.

## 2. Case Types

| Type | Slug | Description |
|---|---|---|
| captacion_premium | captacion-premium | Captación de activo inmobiliario premium |
| comercializacion_activo | comercializacion-activo | Plan de comercialización de activo |
| contexto_energetico | contexto-energetico | Análisis energético para due diligence |
| campana_territorial | campana-territorial | Campaña de captación territorial |
| propuesta_partner | propuesta-partner | Propuesta de colaboración con partner |

## 3. Status Machine

```
draft → review → approved → handed_off → archived
review → draft (reviewer can revert)
approved → archived (admin)
```

## 4. Brief Schema (CaseBriefSchema)

- `objetivo` (string, 10-500 chars) — main objective
- `supuestos` (string[], min 1) — assumptions
- `riesgos` (string[], min 1) — identified risks
- `evidenciaDisponible` (string[]) — available evidence
- `evidenciaPendiente` (string[]) — pending evidence
- `appsImplicadas` (string[], min 1) — apps involved
- `kpis` (array, min 1) — KPIs with nombre, target, unidad
- `proximoPaso` — { accion: string, responsable: string }
- `sensibilidad` — public | internal | confidential | restricted

## 5. Templates

Five templates pre-fill the initial VisionMapVersion with relevant nodes and KPI catalog for each case type.

## 6. Security

- All write operations require `editor` role minimum
- Approve/handoff require `reviewer` role
- Evidence with `restricted` sensitivity is excluded from exports
- All state changes emit an AuditEvent (append-only)
