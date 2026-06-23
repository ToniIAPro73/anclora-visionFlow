# Contract: VisionFlow Case Handoff v1

**Version:** 1.0  
**Direction:** VisionFlow → Nexus  
**Schema:** HandoffPayloadSchema (src/lib/schemas/handoff.ts)  
**HMAC:** x-vf-signature header (HMAC-SHA256, canonical JSON sorted keys)  

## Purpose

The handoff contract is the final step in a VisionFlow Case lifecycle. Once a Case is approved, a reviewer generates a HandoffPayload, previews it, and confirms sending it to Nexus. Nexus receives it as a draft initiative — no irreversible operation is triggered automatically.

## Schema

```typescript
{
  contractVersion: "visionflow-case-handoff-v1"  // literal
  caseId: string
  workspaceId: string
  orgId: string
  initiativeType: "captacion_premium" | "comercializacion_activo" | 
                  "contexto_energetico" | "campana_territorial" | "propuesta_partner"
  executiveSummary: string    // 20-2000 chars
  suggestedActions: Array<{
    accion: string            // min 5 chars
    responsable: string       // min 2 chars
    prioridad: "alta" | "media" | "baja"
  }>                          // min 1 item
  evidenceReferences: Array<{
    source: string
    externalRef: string
    sensitivity: "public" | "internal" | "confidential" | "restricted"
    issuedAt?: string         // ISO datetime
    expiresAt?: string        // ISO datetime
  }>
  risks: string[]
  owner: string               // min 2 chars
  nextSteps: string           // min 5 chars
  idempotencyKey: string      // UUID v4
  returnLink: string          // URL back to VisionFlow case
  generatedAt: string         // ISO datetime
}
```

## Security

- `contractVersion` MUST be `"visionflow-case-handoff-v1"` — hard literal validation
- Evidence with `sensitivity: "restricted"` is NEVER included
- All text fields are sanitized before payload construction (injection patterns removed)
- Payload is signed with HMAC-SHA256 using `NEXUS_HANDOFF_HMAC_SECRET` env var
- Signature is sent as `x-vf-signature` HTTP header
- `idempotencyKey` is a UUID v4 generated per handoff — Nexus must deduplicate on it

## Retry Policy

- Up to 3 attempts with exponential backoff: 2s, 4s (plus 0-500ms jitter)
- Status tracked in `IntegrationDelivery` table
- Failed deliveries remain in DB for manual inspection

## Integration Points

- **Preview:** `POST /api/vision/handoff/preview` — creates HandoffDraft, returns payload for review
- **Confirm:** `POST /api/vision/handoff` — confirms draft and sends to Nexus
- **Status:** `GET /api/vision/handoff/{deliveryId}` — check delivery status
- **Minimum role:** reviewer
- **Case must be:** status `approved`
- **After success:** Case transitions to `handed_off`, AuditEvent emitted
