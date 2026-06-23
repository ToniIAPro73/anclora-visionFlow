import { describe, it, expect } from "vitest";
import { FileManifestSchema } from "@/lib/schemas/depth";

const validManifest = {
  contractVersion: "filestudio-manifest-v1" as const,
  manifestId: "manifest-abc123",
  sha256: "a".repeat(64),
  mimeType: "application/pdf",
  classification: "internal" as const,
  ocrAvailable: true,
  permittedExtract: "Extracto del contrato de arrendamiento...",
  exifStripped: true,
  pages: 12,
  issuedAt: new Date().toISOString(),
};

describe("FileManifestSchema (filestudio-manifest-v1)", () => {
  it("accepts a valid manifest", () => {
    const result = FileManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it("rejects manifest without contractVersion literal", () => {
    const bad = { ...validManifest, contractVersion: "filestudio-manifest-v2" };
    expect(FileManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects sha256 that is not 64 chars", () => {
    const bad = { ...validManifest, sha256: "abc123" };
    expect(FileManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid classification", () => {
    const bad = { ...validManifest, classification: "top-secret" };
    expect(FileManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts manifest without optional fields", () => {
    const minimal = {
      contractVersion: "filestudio-manifest-v1" as const,
      manifestId: "m1",
      sha256: "b".repeat(64),
      mimeType: "image/png",
      classification: "public" as const,
      ocrAvailable: false,
      exifStripped: true,
      issuedAt: new Date().toISOString(),
    };
    expect(FileManifestSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects permittedExtract exceeding 2000 chars", () => {
    const bad = { ...validManifest, permittedExtract: "x".repeat(2001) };
    expect(FileManifestSchema.safeParse(bad).success).toBe(false);
  });

  it("restricted manifest is valid schema (filtering is business logic)", () => {
    const restricted = { ...validManifest, classification: "restricted" as const };
    expect(FileManifestSchema.safeParse(restricted).success).toBe(true);
  });

  it("rejects manifest with exifStripped: false schema-wise is allowed, business layer rejects", () => {
    // Schema allows it (it's a boolean) but business logic rejects it in evidence.ts
    const withExif = { ...validManifest, exifStripped: false };
    const result = FileManifestSchema.safeParse(withExif);
    expect(result.success).toBe(true); // schema valid but business layer rejects
    if (result.success) {
      expect(result.data.exifStripped).toBe(false);
    }
  });

  it("rejects missing required fields", () => {
    const bad = { contractVersion: "filestudio-manifest-v1" };
    expect(FileManifestSchema.safeParse(bad).success).toBe(false);
  });
});
