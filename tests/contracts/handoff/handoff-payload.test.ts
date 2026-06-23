import { describe, it, expect } from "vitest";
import { HandoffPayloadSchema } from "../../../src/lib/schemas/handoff";

describe("HandoffPayloadSchema contract", () => {
  const validPayload = {
    contractVersion: "visionflow-case-handoff-v1" as const,
    caseId: "clx1234567890",
    workspaceId: "workspace_anclora_internal",
    orgId: "anclora-internal",
    initiativeType: "captacion_premium" as const,
    executiveSummary:
      "Captación de activo premium en Andratx con potencial de yield superior al 4% y alta demanda internacional.",
    suggestedActions: [
      {
        accion: "Agendar visita de valoración esta semana",
        responsable: "Agente comercial senior",
        prioridad: "alta" as const,
      },
    ],
    evidenceReferences: [
      {
        source: "data-lab",
        externalRef: "card-001",
        sensitivity: "internal" as const,
        issuedAt: "2026-06-01T10:00:00.000Z",
      },
    ],
    risks: ["Competencia de agencias locales", "Propietario con expectativa de precio alta"],
    owner: "Equipo comercial",
    nextSteps: "Agendar visita de valoración esta semana",
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    returnLink: "https://visionflow.anclora.com/cases/clx1234567890",
    generatedAt: "2026-06-23T12:00:00.000Z",
  };

  it("accepts a valid handoff payload", () => {
    expect(HandoffPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects payload with wrong contractVersion", () => {
    const bad = { ...validPayload, contractVersion: "visionflow-case-handoff-v2" };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects payload with invalid initiativeType", () => {
    const bad = { ...validPayload, initiativeType: "unknown_type" };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects payload with empty suggestedActions", () => {
    const bad = { ...validPayload, suggestedActions: [] };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects payload with invalid idempotencyKey (not UUID)", () => {
    const bad = { ...validPayload, idempotencyKey: "not-a-uuid" };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects payload with invalid returnLink (not URL)", () => {
    const bad = { ...validPayload, returnLink: "not-a-url" };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects payload with executiveSummary too short", () => {
    const bad = { ...validPayload, executiveSummary: "Breve" };
    expect(HandoffPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts all valid initiativeType values", () => {
    const types = [
      "captacion_premium",
      "comercializacion_activo",
      "contexto_energetico",
      "campana_territorial",
      "propuesta_partner",
    ] as const;
    for (const initiativeType of types) {
      expect(HandoffPayloadSchema.safeParse({ ...validPayload, initiativeType }).success).toBe(true);
    }
  });

  it("accepts payload with empty evidenceReferences", () => {
    const ref = { ...validPayload, evidenceReferences: [] };
    expect(HandoffPayloadSchema.safeParse(ref).success).toBe(true);
  });
});
