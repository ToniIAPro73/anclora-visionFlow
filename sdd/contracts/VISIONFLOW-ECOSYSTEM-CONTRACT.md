# CONTRATO DE INTEGRACIÓN — VisionFlow ↔ Ecosistema Anclora
**Versión:** 0.1.0 | **Fecha:** 2026-06-21 | **Estado:** BORRADOR — requiere firma

> Este documento registra los contratos de integración entre AncloraVisionFlow y los demás sistemas del ecosistema Anclora Group. Ningún endpoint de integración puede activarse sin un contrato firmado en este directorio.

---

## Contrato VisionFlow ↔ Anclora Nexus

**Estado:** PENDIENTE — requiere DEC-NEXUS-001

| Campo | Valor |
|---|---|
| Sistema origen | AncloraVisionFlow |
| Sistema destino | Anclora Nexus |
| Tipo de integración | Handoff de borradores de tareas (write) |
| Endpoint destino | TBD — definir con equipo Nexus |
| Auth | TBD — definir con equipo Nexus |
| Payload formato | JSON (ver DES-NEXUS-001 en DESIGN.md) |
| Confirmación humana | **OBLIGATORIA** antes de cualquier llamada |
| Auditoría | Append-only, incluye userId + timestamp + nexusTaskId |
| Gate | GATE-NEXUS-001 |

**Restricciones (preservadas de contrato Bóveda):**
- VisionFlow SOLO puede enviar borradores de tareas para revisión
- VisionFlow NO puede crear, modificar, cancelar ni confirmar tareas directamente
- Toda operación de handoff requiere: map.status === "approved" + sesión admin activa + confirmación explícita en UI

---

## Contrato VisionFlow ↔ Anclora SyncXML

**Estado:** PENDIENTE — requiere DEC-SYNC-001

| Campo | Valor |
|---|---|
| Sistema origen | AncloraVisionFlow |
| Sistema destino | Anclora SyncXML |
| Tipo de integración | Exportación de mapas aprobados (write) |
| Esquema | XML (ver DES-SYNC-001 en DESIGN.md) — XSD pendiente |
| Confirmación humana | **OBLIGATORIA** con preview del payload |
| Gate | DEC-SYNC-001 |

**Restricciones:**
- Solo lectura desde VisionFlow hacia SyncXML (VisionFlow exporta; SyncXML no escribe sobre VisionFlow)
- Solo mapas con `status: approved` pueden exportarse
- Cada exportación queda registrada en audit log

---

## Contrato VisionFlow ↔ Anclora Private Estates

**Estado:** PROHIBIDO

**Restricciones absolutas (preservadas de contrato Bóveda):**
- VisionFlow no puede crear, modificar, cancelar ni confirmar reservas en Anclora Private Estates
- VisionFlow no puede acceder a datos de clientes de Private Estates sin contrato explícito aprobado
- Cualquier integración futura requiere: contrato verificado + autorización humana + auditoría completa
- Este contrato NO puede activarse en Fase 0 ni Fase 1

---

## Registro de Contratos

| Contrato | Estado | Gate | Activable en |
|---|---|---|---|
| VisionFlow ↔ Nexus | PENDIENTE | GATE-NEXUS-001 | Fase 1 |
| VisionFlow ↔ SyncXML | PENDIENTE | DEC-SYNC-001 | Fase 2 |
| VisionFlow ↔ Private Estates | PROHIBIDO | N/A — requiere nuevo contrato Bóveda | Fase 3+ |
| VisionFlow ↔ DataLab | NO INICIADO | TBD | Fase 3 |
| VisionFlow ↔ Synergi | NO INICIADO | TBD | Fase 3 |
