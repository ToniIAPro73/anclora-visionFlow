# Contract: EnergyScan Reference v1

**Version:** 1.0  
**Direction:** EnergyScan → VisionFlow  
**Schema:** EnergyReferenceSchema (src/lib/schemas/activation.ts)  

## Purpose

EnergyScan references attach an energy assessment to a VisionFlow Case. They provide energy certification data to enrich property due diligence and commercial proposals.

## Schema

```typescript
{
  assessmentId: string     // unique assessment ID in EnergyScan
  propertyRef: string      // property reference (cadastral or internal)
  scenarioId: string       // scenario/version identifier
  calificacion: "A"|"B"|"C"|"D"|"E"|"F"|"G"  // energy rating
  kwhYear: number          // annual energy consumption (positive)
  co2KgYear: number        // annual CO2 emissions (non-negative)
  limitations: string[]    // known limitations of the assessment
  issuedAt: string         // ISO datetime when issued
}
```

## Rules

- `calificacion` must be a valid EU energy rating letter (A-G)
- `kwhYear` must be a positive number
- `co2KgYear` must be non-negative
- `limitations` field is required (can be empty array)
- References are stored with `sensitivity: "internal"`, `kind: "energyscan_reference"`
- `reviewState` is set to `"approved"` on import (trusted source)

## Integration Points

- **Attach:** `POST /api/vision/cases/{id}/evidence` with `{ kind: "energyscan_reference", data: EnergyReference }`
- **Minimum role:** editor
- **Audit:** AuditEvent with action `import`, resourceType `EvidenceReference`
