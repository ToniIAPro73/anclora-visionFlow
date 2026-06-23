import { describe, it, expect } from "vitest";
import { InsightCardSchema } from "../../../src/lib/schemas/activation";

describe("InsightCardSchema contract", () => {
  const validCard = {
    cardId: "card-001",
    title: "Análisis de demanda Andratx Q2 2026",
    summary:
      "La demanda de activos premium en Andratx se mantiene estable con un incremento del 12% en compradores nórdicos.",
    version: "v1.2.0",
    issuedAt: "2026-06-01T10:00:00.000Z",
    source: "data-lab",
    indicators: [
      { nombre: "% compradores nórdicos", valor: 42, unidad: "%" },
      { nombre: "Precio medio €/m²", valor: 8500 },
    ],
  };

  it("accepts a valid insight card", () => {
    expect(InsightCardSchema.safeParse(validCard).success).toBe(true);
  });

  it("accepts card without expiresAt", () => {
    const { expiresAt: _, ...noExpiry } = { ...validCard, expiresAt: undefined };
    expect(InsightCardSchema.safeParse(noExpiry).success).toBe(true);
  });

  it("accepts card with future expiresAt", () => {
    const card = { ...validCard, expiresAt: "2027-01-01T00:00:00.000Z" };
    expect(InsightCardSchema.safeParse(card).success).toBe(true);
  });

  it("rejects card with missing cardId", () => {
    const { cardId: _, ...noId } = validCard;
    expect(InsightCardSchema.safeParse(noId).success).toBe(false);
  });

  it("rejects card with empty title", () => {
    const bad = { ...validCard, title: "ab" };
    expect(InsightCardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects card with invalid issuedAt", () => {
    const bad = { ...validCard, issuedAt: "not-a-date" };
    expect(InsightCardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects card with summary too short", () => {
    const bad = { ...validCard, summary: "Too short" };
    expect(InsightCardSchema.safeParse(bad).success).toBe(false);
  });
});
