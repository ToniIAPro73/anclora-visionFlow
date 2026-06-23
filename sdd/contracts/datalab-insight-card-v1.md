# Contract: Data Lab Insight Card v1

**Version:** 1.0  
**Direction:** Data Lab → VisionFlow  
**Schema:** InsightCardSchema (src/lib/schemas/activation.ts)  

## Purpose

Data Lab insight cards are structured analytics cards that can be attached to a VisionFlow Case as evidence. They provide market intelligence, demand analysis, or property data insights.

## Schema

```typescript
{
  cardId: string           // unique card identifier in Data Lab
  title: string            // card title (3-200 chars)
  summary: string          // card summary (10-2000 chars)
  version: string          // card version (used as hash)
  issuedAt: string         // ISO datetime when issued
  expiresAt?: string       // ISO datetime when expires (optional)
  source: string           // default "data-lab"
  indicators: Array<{
    nombre: string
    valor: string | number
    unidad?: string
  }>
}
```

## Rules

- Cards with `expiresAt` in the past are rejected (status 400, "Evidence card has expired")
- Cards are stored with `sensitivity: "internal"`, `kind: "datalab_insight_card"`
- `reviewState` is set to `"approved"` on import (trusted source)
- Cards with `sensitivity: "restricted"` are excluded from BriefExport and HandoffPayload

## Integration Points

- **Attach:** `POST /api/vision/cases/{id}/evidence` with `{ kind: "datalab_insight_card", data: InsightCard }`
- **Minimum role:** editor
- **Audit:** AuditEvent with action `import`, resourceType `EvidenceReference`
