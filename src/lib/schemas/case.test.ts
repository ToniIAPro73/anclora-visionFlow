import { describe, it, expect } from "vitest";
import { CaseBriefSchema, CreateCaseSchema } from "./case";

describe("CaseBriefSchema", () => {
  const validBrief = {
    objetivo: "Captar un mandato premium en Andratx",
    supuestos: ["El propietario está abierto a negociar"],
    riesgos: ["Competencia de agencias locales"],
    appsImplicadas: ["nexus"],
    kpis: [{ nombre: "Probabilidad de mandato", target: "70", unidad: "%" }],
    proximoPaso: {
      accion: "Agendar visita de valoración",
      responsable: "Agente comercial",
    },
  };

  it("accepts valid brief", () => {
    expect(CaseBriefSchema.safeParse(validBrief).success).toBe(true);
  });

  it("rejects brief with empty responsable", () => {
    const bad = {
      ...validBrief,
      proximoPaso: { accion: "Algo importante", responsable: "" },
    };
    expect(CaseBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief without KPIs", () => {
    const bad = { ...validBrief, kpis: [] };
    expect(CaseBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with objetivo too short", () => {
    const bad = { ...validBrief, objetivo: "Breve" };
    expect(CaseBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects brief with empty supuestos", () => {
    const bad = { ...validBrief, supuestos: [] };
    expect(CaseBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("defaults sensibilidad to internal if not provided", () => {
    const result = CaseBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sensibilidad).toBe("internal");
    }
  });
});

describe("CreateCaseSchema", () => {
  const validCase = {
    type: "captacion_premium" as const,
    templateSlug: "captacion-premium",
    title: "Captación activo Andratx",
    brief: {
      objetivo: "Captar un mandato premium en Andratx",
      supuestos: ["El propietario está abierto a negociar"],
      riesgos: ["Competencia de agencias locales"],
      appsImplicadas: ["nexus"],
      kpis: [{ nombre: "Probabilidad de mandato", target: "70", unidad: "%" }],
      proximoPaso: {
        accion: "Agendar visita de valoración",
        responsable: "Agente comercial",
      },
    },
  };

  it("accepts valid create case input", () => {
    expect(CreateCaseSchema.safeParse(validCase).success).toBe(true);
  });

  it("rejects invalid case type", () => {
    const bad = { ...validCase, type: "unknown_type" };
    expect(CreateCaseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects title too short", () => {
    const bad = { ...validCase, title: "abc" };
    expect(CreateCaseSchema.safeParse(bad).success).toBe(false);
  });
});
