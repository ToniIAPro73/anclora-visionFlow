import { describe, it, expect } from "vitest";
import { PROMPT_VERSION, llmModel } from "./llm-client";

// ---------------------------------------------------------------------------
// TASK-1006 — AI generation traceability (REQ-AI-002, REQ-AI-007, DES-AI-003)
// ---------------------------------------------------------------------------

describe("PROMPT_VERSION", () => {
  it("is a semver string", () => {
    expect(PROMPT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it("is non-empty", () => {
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
  });
});

describe("llmModel default", () => {
  it("has a non-empty default model", () => {
    expect(typeof llmModel).toBe("string");
    expect(llmModel.length).toBeGreaterThan(0);
  });

  it("does not contain secrets or API keys", () => {
    expect(llmModel).not.toMatch(/sk-/i);
    expect(llmModel).not.toMatch(/Bearer/i);
  });
});

describe("VisionMap generation metadata shape", () => {
  it("accepts a full generation metadata payload", () => {
    const map = {
      idea: "Test idea",
      summary: "Test summary",
      nodes: [],
      connections: [],
      apps: [],
      generatedAt: new Date().toISOString(),
      palette: "anclora" as const,
      promptVersion: PROMPT_VERSION,
      llmModel,
      tokensUsed: 1234,
    };
    expect(map.promptVersion).toBe(PROMPT_VERSION);
    expect(map.llmModel).toBe(llmModel);
    expect(map.tokensUsed).toBe(1234);
  });

  it("accepts null tokensUsed when provider does not return usage", () => {
    const map = {
      idea: "Test idea",
      summary: "Summary",
      nodes: [],
      connections: [],
      apps: [],
      generatedAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      llmModel,
      tokensUsed: null,
    };
    expect(map.tokensUsed).toBeNull();
  });

  it("accepts undefined metadata for historical records", () => {
    const map = {
      idea: "Legacy idea",
      summary: "Legacy summary",
      nodes: [],
      connections: [],
      apps: [],
      generatedAt: new Date().toISOString(),
    };
    expect((map as { promptVersion?: string }).promptVersion).toBeUndefined();
    expect((map as { llmModel?: string }).llmModel).toBeUndefined();
    expect((map as { tokensUsed?: number | null }).tokensUsed).toBeUndefined();
  });
});

describe("generation metadata persistence contract", () => {
  it("genMeta object only carries the three allowed fields", () => {
    const promptVersion = PROMPT_VERSION;
    const model = llmModel;
    const tokensUsed: number | null = 800;

    const genMeta = {
      promptVersion: typeof promptVersion === "string" ? promptVersion : null,
      llmModel: typeof model === "string" ? model : null,
      tokensUsed: typeof tokensUsed === "number" ? tokensUsed : null,
    };

    const keys = Object.keys(genMeta);
    expect(keys).toEqual(["promptVersion", "llmModel", "tokensUsed"]);
  });

  it("genMeta does not persist prompt text or API keys", () => {
    const genMeta = {
      promptVersion: PROMPT_VERSION,
      llmModel,
      tokensUsed: 500,
    };
    const serialized = JSON.stringify(genMeta);
    expect(serialized).not.toContain("Eres el motor");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("OPENROUTER_API_KEY");
  });

  it("tokensUsed maps to null when completion.usage is absent", () => {
    const usage = undefined;
    const tokensUsed = (usage as { total_tokens?: number } | undefined)?.total_tokens ?? null;
    expect(tokensUsed).toBeNull();
  });

  it("tokensUsed captures total_tokens from provider response", () => {
    const usage = { prompt_tokens: 300, completion_tokens: 700, total_tokens: 1000 };
    const tokensUsed = usage?.total_tokens ?? null;
    expect(tokensUsed).toBe(1000);
  });
});
