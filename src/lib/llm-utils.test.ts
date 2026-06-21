import { describe, it, expect } from "vitest";
import { repairTruncatedJson } from "./llm-utils";

describe("repairTruncatedJson", () => {
  it("returns valid JSON unchanged", () => {
    const input = '{"summary":"ok","nodes":[]}';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ summary: "ok", nodes: [] });
  });

  it("closes unclosed object", () => {
    const input = '{"summary":"truncated"';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).summary).toBe("truncated");
  });

  it("closes unclosed array inside object", () => {
    const input = '{"nodes":[{"title":"A"},{"title":"B"';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).nodes).toHaveLength(2);
  });

  it("removes trailing comma before closing", () => {
    const input = '{"nodes":[{"title":"A"},';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("closes unclosed string", () => {
    const input = '{"title":"hello world';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).title).toBe("hello world");
  });

  it("handles empty string gracefully", () => {
    expect(repairTruncatedJson("")).toBe("");
  });

  it("handles deeply nested truncation", () => {
    const input = '{"a":{"b":{"c":[1,2';
    const result = repairTruncatedJson(input);
    expect(() => JSON.parse(result)).not.toThrow();
  });
});
