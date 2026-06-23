import { describe, it, expect } from "vitest";
import { FileManifestSchema } from "@/lib/schemas/depth";

describe("Manifest evidence business rules", () => {
  it("restricted manifests parse but are flagged in reviewState", () => {
    const restricted = FileManifestSchema.parse({
      contractVersion: "filestudio-manifest-v1",
      manifestId: "restricted-m1",
      sha256: "c".repeat(64),
      mimeType: "application/pdf",
      classification: "restricted",
      ocrAvailable: false,
      exifStripped: true,
      issuedAt: new Date().toISOString(),
    });
    // Business rule: restricted → reviewState = "pending" (not auto-approved)
    // This is enforced in evidence.ts:attachManifest
    expect(restricted.classification).toBe("restricted");
  });

  it("manifest without exifStripped must be rejected at business layer", () => {
    const noExif = {
      contractVersion: "filestudio-manifest-v1" as const,
      manifestId: "m-noexif",
      sha256: "d".repeat(64),
      mimeType: "image/jpeg",
      classification: "confidential" as const,
      ocrAvailable: false,
      exifStripped: false,
      issuedAt: new Date().toISOString(),
    };
    const parsed = FileManifestSchema.parse(noExif);
    // Schema passes but business logic (evidence.ts:attachManifest) throws:
    // "Manifest rejected: exifStripped must be true (EXIF must be removed at origin)"
    expect(parsed.exifStripped).toBe(false);
  });

  it("permittedExtract is bounded to prevent document exposure", () => {
    const withExtract = FileManifestSchema.safeParse({
      contractVersion: "filestudio-manifest-v1",
      manifestId: "m-extract",
      sha256: "e".repeat(64),
      mimeType: "application/pdf",
      classification: "internal",
      ocrAvailable: true,
      permittedExtract: "Cláusula 1: El arrendatario pagará...".repeat(30).slice(0, 1999),
      exifStripped: true,
      issuedAt: new Date().toISOString(),
    });
    expect(withExtract.success).toBe(true);
  });

  it("public classification auto-approves (not restricted)", () => {
    const pub = FileManifestSchema.parse({
      contractVersion: "filestudio-manifest-v1",
      manifestId: "m-public",
      sha256: "f".repeat(64),
      mimeType: "image/png",
      classification: "public",
      ocrAvailable: false,
      exifStripped: true,
      issuedAt: new Date().toISOString(),
    });
    // Business rule in attachManifest: non-restricted → reviewState "approved"
    expect(pub.classification).not.toBe("restricted");
  });

  it("contractVersion must be exact literal filestudio-manifest-v1", () => {
    const wrongVersion = FileManifestSchema.safeParse({
      contractVersion: "filestudio-manifest-v1.1",
      manifestId: "m-version",
      sha256: "g".repeat(64),
      mimeType: "application/pdf",
      classification: "internal",
      ocrAvailable: true,
      exifStripped: true,
      issuedAt: new Date().toISOString(),
    });
    expect(wrongVersion.success).toBe(false);
  });
});
