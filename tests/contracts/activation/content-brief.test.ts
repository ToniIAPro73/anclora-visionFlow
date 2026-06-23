import { describe, it, expect } from "vitest";
import { ContentBriefSchema } from "../../../src/lib/schemas/activation";

describe("ContentBriefSchema contract", () => {
  const validBrief = {
    contractVersion: "content-brief-v1" as const,
    caseId: "clx1234567890",
    audience: "Agente comercial senior",
    valueProposition:
      "Captación de activo premium en zona de alta demanda internacional con potencial de yield superior al 4%.",
    allowedEvidence: ["card-001", "ESCAN-2026-001"],
    objections: [],
    prohibitedClaims: [
      "garantía de rentabilidad",
      "certificado oficial",
      "precio exacto garantizado",
    ],
    tone: "profesional" as const,
    language: "es",
    cta: "Agendar visita de valoración esta semana",
    channels: ["email", "linkedin"],
  };

  it("accepts a valid content brief", () => {
    expect(ContentBriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("rejects brief with wrong contractVersion", () => {
    const bad = { ...validBrief, contractVersion: "content-brief-v2" };
    expect(ContentBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with empty audience", () => {
    const bad = { ...validBrief, audience: "A" };
    expect(ContentBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with missing channels", () => {
    const bad = { ...validBrief, channels: [] };
    expect(ContentBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with cta too short", () => {
    const bad = { ...validBrief, cta: "Hola" }; // 4 chars, min is 5
    expect(ContentBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with invalid tone", () => {
    const bad = { ...validBrief, tone: "casual" };
    expect(ContentBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts brief with empty allowedEvidence", () => {
    const ref = { ...validBrief, allowedEvidence: [] };
    expect(ContentBriefSchema.safeParse(ref).success).toBe(true);
  });

  it("accepts all valid tone values", () => {
    for (const tone of ["profesional", "cercano", "tecnico", "premium"] as const) {
      const ref = { ...validBrief, tone };
      expect(ContentBriefSchema.safeParse(ref).success).toBe(true);
    }
  });
});
