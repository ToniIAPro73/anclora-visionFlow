# Contract: Content Brief v1

**Version:** 1.0  
**Direction:** VisionFlow → Content Generator AI  
**Schema:** ContentBriefSchema (src/lib/schemas/activation.ts)  

## Purpose

A ContentBrief is a structured brief that VisionFlow exports to Content Generator AI. It contains approved marketing direction, evidence references, and prohibited claims — ready for content generation without requiring access to restricted case data.

## Schema

```typescript
{
  contractVersion: "content-brief-v1"  // literal — validated on import
  caseId: string
  audience: string             // target audience (2-200 chars)
  valueProposition: string     // main value prop (10-1000 chars)
  allowedEvidence: string[]    // external refs of approved, non-restricted evidence
  objections: string[]         // anticipated objections to address
  prohibitedClaims: string[]   // claims that must NOT appear in generated content
  tone: "profesional"|"cercano"|"tecnico"|"premium"
  language: string             // default "es"
  cta: string                  // call to action (5-200 chars)
  channels: string[]           // target channels (min 1)
}
```

## Rules

- `contractVersion` MUST be `"content-brief-v1"` — hard schema validation
- Evidence with `sensitivity: "restricted"` is NEVER included in `allowedEvidence`
- `prohibitedClaims` always includes at minimum: garantía de rentabilidad, certificado oficial, precio exacto garantizado
- Content Generator AI MUST NOT use claims from `prohibitedClaims` in generated content
- All text fields are sanitized before export (injection patterns removed)

## Integration Points

- **Generate:** `POST /api/vision/cases/{id}/brief` (requires reviewer role)
- **Stored in:** `BriefExport` table, `target: "content-generator-ai"`
- **Audit:** AuditEvent with action `export`, resourceType `BriefExport`
