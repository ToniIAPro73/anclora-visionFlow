import { describe, it, expect } from "vitest";
import { RagQuerySchema } from "@/lib/schemas/depth";

describe("RagQuerySchema", () => {
  it("accepts valid query", () => {
    const result = RagQuerySchema.safeParse({ query: "captacion premium mallorca", limit: 5 });
    expect(result.success).toBe(true);
    expect(result.data?.excludeRestricted).toBe(true);
  });

  it("rejects query under 3 chars", () => {
    expect(RagQuerySchema.safeParse({ query: "ab" }).success).toBe(false);
  });

  it("rejects limit over 10", () => {
    expect(RagQuerySchema.safeParse({ query: "test query", limit: 11 }).success).toBe(false);
  });

  it("defaults excludeRestricted to true", () => {
    const result = RagQuerySchema.safeParse({ query: "test query here" });
    expect(result.data?.excludeRestricted).toBe(true);
  });

  it("defaults limit to 5", () => {
    const result = RagQuerySchema.safeParse({ query: "test query here" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(5);
  });

  it("accepts excludeRestricted: false", () => {
    const result = RagQuerySchema.safeParse({
      query: "test query here",
      excludeRestricted: false,
    });
    expect(result.success).toBe(true);
    expect(result.data?.excludeRestricted).toBe(false);
  });

  it("rejects query over 500 chars", () => {
    expect(RagQuerySchema.safeParse({ query: "a".repeat(501) }).success).toBe(false);
  });
});
