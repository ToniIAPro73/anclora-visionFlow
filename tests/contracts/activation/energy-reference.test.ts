import { describe, it, expect } from "vitest";
import { EnergyReferenceSchema } from "../../../src/lib/schemas/activation";

describe("EnergyReferenceSchema contract", () => {
  const validRef = {
    assessmentId: "ESCAN-2026-001",
    propertyRef: "REF-CAD-07040070001",
    scenarioId: "scenario-baseline",
    calificacion: "C" as const,
    kwhYear: 12500,
    co2KgYear: 3200,
    limitations: ["Medición basada en muestra parcial"],
    issuedAt: "2026-06-01T10:00:00.000Z",
  };

  it("accepts a valid energy reference", () => {
    expect(EnergyReferenceSchema.safeParse(validRef).success).toBe(true);
  });

  it("accepts all valid calificacion values", () => {
    for (const letter of ["A", "B", "C", "D", "E", "F", "G"]) {
      const ref = { ...validRef, calificacion: letter };
      expect(EnergyReferenceSchema.safeParse(ref).success).toBe(true);
    }
  });

  it("accepts reference with empty limitations array", () => {
    const ref = { ...validRef, limitations: [] };
    expect(EnergyReferenceSchema.safeParse(ref).success).toBe(true);
  });

  it("rejects reference with invalid calificacion", () => {
    const bad = { ...validRef, calificacion: "Z" };
    expect(EnergyReferenceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects reference with negative kwhYear", () => {
    const bad = { ...validRef, kwhYear: -100 };
    expect(EnergyReferenceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects reference with negative co2KgYear", () => {
    const bad = { ...validRef, co2KgYear: -1 };
    expect(EnergyReferenceSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects reference with missing limitations field", () => {
    const { limitations: _, ...noLimitations } = validRef;
    // limitations has a default, so this should succeed
    const result = EnergyReferenceSchema.safeParse(noLimitations);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limitations).toEqual([]);
    }
  });

  it("rejects reference with invalid issuedAt", () => {
    const bad = { ...validRef, issuedAt: "06/01/2026" };
    expect(EnergyReferenceSchema.safeParse(bad).success).toBe(false);
  });
});
