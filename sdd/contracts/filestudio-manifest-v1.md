# Contract: filestudio-manifest-v1

| Attribute | Value |
|---|---|
| Direction | FileStudio emits → VisionFlow consumes |
| Schema | FileManifestSchema (AVF-DEPTH-001 §4.1) |
| Transport | JSON manifest; original file stays local in FileStudio |
| Guarantees | (1) sha256 integrity; (2) EXIF stripped at origin; (3) only permitted extract, never full document; (4) sensitivity classification required; (5) restricted does not travel to external LLM |
| Versioning | Breaking change → filestudio-manifest-v2, maintaining v1 until agreed migration |

## Schema

```typescript
{
  contractVersion: "filestudio-manifest-v1",
  manifestId: string,
  sha256: string (64 chars),
  mimeType: string,
  classification: "public" | "internal" | "confidential" | "restricted",
  ocrAvailable: boolean,
  permittedExtract?: string (max 2000 chars),
  exifStripped: boolean,
  pages?: number,
  issuedAt: string (ISO datetime)
}
```

## Cross-repo requirements

- `anclora-filestudio`: must emit manifests conforming to this contract (sha256, OCR availability, classification, EXIF stripped, permitted extract). Original document never leaves local environment.
- `anclora-nexus`: must emit lead status change events consumable by the realtime channel (authenticated).
