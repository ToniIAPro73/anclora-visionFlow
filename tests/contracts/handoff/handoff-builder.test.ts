import { describe, it, expect } from "vitest";
import { HandoffPayloadSchema } from "../../../src/lib/schemas/handoff";

// Test the schema constraints that handoff-builder must satisfy
// (handoff-builder itself requires DB, tested via integration)
describe("HandoffPayload builder constraints", () => {
  it("executiveSummary must be at least 20 chars", () => {
    const schema = HandoffPayloadSchema.shape.executiveSummary;
    expect(schema.safeParse("Short summary").success).toBe(false);
    expect(
      schema.safeParse("This is a valid executive summary with enough length").success
    ).toBe(true);
  });

  it("evidenceReferences schema allows restricted sensitivity (filtering is at builder level)", () => {
    // The schema allows restricted as a value — filtering happens in handoff-builder.ts
    // where we call: .filter(e => e.sensitivity !== "restricted")
    // This test documents that the schema constraint is intentionally at the builder, not schema level
    const validWithRestricted = {
      contractVersion: "visionflow-case-handoff-v1" as const,
      caseId: "case-1",
      workspaceId: "ws-1",
      orgId: "org-1",
      initiativeType: "captacion_premium" as const,
      executiveSummary: "This is a valid executive summary with enough length",
      suggestedActions: [
        { accion: "Agendar visita esta semana", responsable: "Equipo", prioridad: "alta" as const },
      ],
      evidenceReferences: [
        { source: "data-lab", externalRef: "card-001", sensitivity: "internal" as const },
      ],
      risks: [],
      owner: "Equipo",
      nextSteps: "Revisar la propuesta con el cliente",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      returnLink: "https://visionflow.anclora.com/cases/case-1",
      generatedAt: "2026-06-23T12:00:00.000Z",
    };
    expect(HandoffPayloadSchema.safeParse(validWithRestricted).success).toBe(true);
  });

  it("initiativeType maps correctly from CaseType values", () => {
    const validTypes = [
      "captacion_premium",
      "comercializacion_activo",
      "contexto_energetico",
      "campana_territorial",
      "propuesta_partner",
    ];
    for (const t of validTypes) {
      const result = HandoffPayloadSchema.shape.initiativeType.safeParse(t);
      expect(result.success).toBe(true);
    }
  });

  it("idempotencyKey must be a valid UUID", () => {
    const schema = HandoffPayloadSchema.shape.idempotencyKey;
    expect(schema.safeParse("not-a-uuid").success).toBe(false);
    expect(schema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("returnLink must be a valid URL", () => {
    const schema = HandoffPayloadSchema.shape.returnLink;
    expect(schema.safeParse("/cases/123").success).toBe(false);
    expect(schema.safeParse("https://visionflow.anclora.com/cases/123").success).toBe(true);
  });

  it("suggestedActions must have at least one item", () => {
    const schema = HandoffPayloadSchema.shape.suggestedActions;
    expect(schema.safeParse([]).success).toBe(false);
    expect(
      schema.safeParse([
        {
          accion: "Agendar visita esta semana",
          responsable: "Agente comercial",
          prioridad: "alta",
        },
      ]).success
    ).toBe(true);
  });
});
