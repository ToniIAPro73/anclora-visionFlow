import { describe, it, expect } from "vitest";
import { listTemplates, getTemplate } from "./case-templates";

describe("case-templates", () => {
  it("returns 5 templates", () => {
    expect(listTemplates()).toHaveLength(5);
  });

  it("getTemplate returns captacion-premium", () => {
    const t = getTemplate("captacion-premium");
    expect(t).toBeDefined();
    expect(t?.type).toBe("captacion_premium");
    expect(t?.prefilledNodes.length).toBeGreaterThan(0);
  });

  it("getTemplate returns undefined for unknown slug", () => {
    expect(getTemplate("unknown")).toBeUndefined();
  });

  it("all templates have required categories and kpiCatalog", () => {
    for (const t of listTemplates()) {
      expect(t.requiredCategories.length).toBeGreaterThan(0);
      expect(t.kpiCatalog.length).toBeGreaterThan(0);
    }
  });

  it("all templates have valid type matching slug pattern", () => {
    const slugTypes: Record<string, string> = {
      "captacion-premium": "captacion_premium",
      "comercializacion-activo": "comercializacion_activo",
      "contexto-energetico": "contexto_energetico",
      "campana-territorial": "campana_territorial",
      "propuesta-partner": "propuesta_partner",
    };
    for (const t of listTemplates()) {
      expect(t.type).toBe(slugTypes[t.slug]);
    }
  });

  it("all templates have at least one prefilled node", () => {
    for (const t of listTemplates()) {
      expect(t.prefilledNodes.length).toBeGreaterThan(0);
    }
  });
});
