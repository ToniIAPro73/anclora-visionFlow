import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import {
  checkGenerationRateLimit,
  resetGenerationRateLimitStore,
} from "@/lib/generation-rate-limit";

const createMock = vi.fn();

vi.mock("@/lib/llm-client", () => ({
  PROMPT_VERSION: "v1.0.0",
  llmModel: "test/model",
  getLlmClient: () => ({
    chat: {
      completions: {
        create: createMock,
      },
    },
  }),
}));

vi.mock("@/lib/anclora-catalog", () => ({
  getCatalogForPrompt: vi.fn(async () => ({
    catalogText: "- nexus: Anclora Nexus",
    apps: [
      {
        slug: "nexus",
        name: "Anclora Nexus",
        tagline: "Operaciones",
        domain: "ops",
        description: "Gestion operativa",
        capabilities: ["Gestion"],
        stack: ["Next.js"],
        agentsMd: "",
      },
    ],
  })),
}));

afterEach(() => {
  resetGenerationRateLimitStore();
  createMock.mockReset();
  delete process.env.VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS;
  delete process.env.VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS;
  delete process.env.VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS;
});

describe("POST /api/vision/generate rate limit", () => {
  it("returns 429 with Retry-After and does not call the LLM when blocked", async () => {
    process.env.VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS = "1";
    process.env.VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS = "60";
    checkGenerationRateLimit(
      "ip:203.0.113.10",
      { limit: 1, windowMs: 60_000, maxKeys: 1000 },
      Date.now()
    );

    const req = new NextRequest("http://localhost/api/vision/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "203.0.113.10",
      },
      body: JSON.stringify({ idea: "Idea confidencial que no debe llegar al LLM" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(body).toEqual({
      code: "RATE_LIMITED",
      message:
        "Has alcanzado el límite temporal de generación. Espera unos segundos antes de intentarlo de nuevo.",
    });
    expect(createMock).not.toHaveBeenCalled();
  });
});
