import { describe, it, expect } from "vitest";
import {
  createGenerationReceipt,
  getVerifiedGenerationMetadata,
  verifyGenerationReceipt,
} from "./generation-receipt";
import { PROMPT_VERSION, llmModel } from "./llm-client";
import type { VisionMap } from "./vision-map";

const TEST_SECRET = "test-generation-receipt-secret";
const TEST_NOW = Date.parse("2026-06-21T08:00:00.000Z");

function buildMap(overrides: Partial<VisionMap> = {}): VisionMap {
  return {
    idea: "Automatizar auditoria de propuestas",
    summary: "Mapa generado para auditar propuestas con trazabilidad operativa.",
    nodes: [
      {
        id: "node-1",
        category: "idea",
        title: "Auditoria verificable",
        description: "Centralizar evidencias de generacion y revision.",
        x: 0,
        y: 0,
      },
    ],
    connections: [],
    apps: ["nexus"],
    generatedAt: "2026-06-21T08:00:00.000Z",
    palette: "anclora",
    ...overrides,
  };
}

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
  it("verified metadata object only carries the three persisted fields", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 800 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const genMeta = getVerifiedGenerationMetadata(map, receipt, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    });
    const keys = Object.keys(genMeta);
    expect(keys).toEqual(["promptVersion", "llmModel", "tokensUsed"]);
  });

  it("receipt payload does not include prompt text, API keys, or user content", () => {
    const map = buildMap({ idea: "Cliente confidencial ACME" });
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 500 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const payload = JSON.parse(Buffer.from(receipt.split(".")[1], "base64url").toString("utf8"));
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("Eres el motor");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("OPENROUTER_API_KEY");
    expect(serialized).not.toContain("Cliente confidencial ACME");
    expect(Object.keys(payload).sort()).toEqual([
      "expiresAt",
      "issuedAt",
      "llmModel",
      "mapHash",
      "nonce",
      "promptVersion",
      "tokensUsed",
      "v",
    ]);
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

describe("verified generation receipt protection (REQ-AI-002)", () => {
  it("ignores payload values that try to forge all three metadata fields", () => {
    const generatedMap = buildMap();
    const receipt = createGenerationReceipt(
      generatedMap,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 321 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const map = buildMap({
      promptVersion: "v99.9.9",
      llmModel: "gpt-4o",
      tokensUsed: 999999,
      generationReceipt: receipt,
    });
    const meta = getVerifiedGenerationMetadata(map, map.generationReceipt, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 321 });
  });

  it("accepts a valid server-issued receipt", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 1234 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const meta = getVerifiedGenerationMetadata(map, receipt, {
      now: TEST_NOW + 60_000,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 1234 });
  });

  it("rejects an altered receipt", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 1234 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const tamperedReceipt = receipt.replace(/.$/, receipt.endsWith("a") ? "b" : "a");
    expect(verifyGenerationReceipt(map, tamperedReceipt, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    })).toBeNull();
  });

  it("rejects an expired receipt", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 1234 },
      { now: TEST_NOW, ttlMs: 1_000, secret: TEST_SECRET }
    );
    const meta = getVerifiedGenerationMetadata(map, receipt, {
      now: TEST_NOW + 1_001,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: null, llmModel: null, tokensUsed: null });
  });

  it("treats maps saved without a receipt as imported or unverified", () => {
    const map = buildMap();
    const meta = getVerifiedGenerationMetadata(map, undefined, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: null, llmModel: null, tokensUsed: null });
  });

  it("persists null tokensUsed when provider usage.total_tokens is absent", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: null },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const meta = getVerifiedGenerationMetadata(map, receipt, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: PROMPT_VERSION, llmModel, tokensUsed: null });
  });

  it("rejects a valid receipt when the map content no longer matches", () => {
    const map = buildMap();
    const receipt = createGenerationReceipt(
      map,
      { promptVersion: PROMPT_VERSION, llmModel, tokensUsed: 1234 },
      { now: TEST_NOW, secret: TEST_SECRET }
    );
    const editedMap = buildMap({ summary: "Resumen alterado por el cliente." });
    const meta = getVerifiedGenerationMetadata(editedMap, receipt, {
      now: TEST_NOW,
      secret: TEST_SECRET,
    });
    expect(meta).toEqual({ promptVersion: null, llmModel: null, tokensUsed: null });
  });
});
