import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkGenerationRateLimit,
  getGenerationRateLimitConfig,
  getGenerationRateLimitKey,
  getGenerationRateLimitStoreSnapshot,
  resetGenerationRateLimitStore,
  type GenerationRateLimitConfig,
} from "./generation-rate-limit";

const CONFIG: GenerationRateLimitConfig = {
  limit: 2,
  windowMs: 60_000,
  maxKeys: 3,
};

afterEach(() => {
  resetGenerationRateLimitStore();
});

describe("generation rate limit", () => {
  it("allows requests inside the configured limit", () => {
    const first = checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 1_000);
    const second = checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 2_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks requests above the configured limit with Retry-After data", () => {
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 1_000);
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 2_000);
    const blocked = checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 3_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
    expect(blocked.remaining).toBe(0);
  });

  it("resets the counter after the window expires", () => {
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 1_000);
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 2_000);

    const afterWindow = checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 61_001);

    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(1);
  });

  it("cleans expired entries and evicts the least recently seen entry at capacity", () => {
    checkGenerationRateLimit("ip:203.0.113.1", CONFIG, 1_000);
    checkGenerationRateLimit("ip:203.0.113.2", CONFIG, 2_000);
    checkGenerationRateLimit("ip:203.0.113.3", CONFIG, 3_000);
    checkGenerationRateLimit("ip:203.0.113.4", CONFIG, 4_000);

    expect(getGenerationRateLimitStoreSnapshot().map((entry) => entry.key)).toEqual([
      "ip:203.0.113.2",
      "ip:203.0.113.3",
      "ip:203.0.113.4",
    ]);

    checkGenerationRateLimit("ip:203.0.113.5", CONFIG, 65_000);
    expect(getGenerationRateLimitStoreSnapshot()).toHaveLength(1);
    expect(getGenerationRateLimitStoreSnapshot()[0].key).toBe("ip:203.0.113.5");
  });

  it("isolates counters between different keys", () => {
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 1_000);
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 2_000);
    const otherKey = checkGenerationRateLimit("ip:203.0.113.11", CONFIG, 3_000);

    expect(otherKey.allowed).toBe(true);
    expect(otherKey.remaining).toBe(1);
  });

  it("derives the key from Caddy-overwritten IP headers with a local fallback", () => {
    const proxied = new NextRequest("http://localhost/api/vision/generate", {
      headers: { "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.8" },
    });
    const forwardedOnly = new NextRequest("http://localhost/api/vision/generate", {
      headers: { "x-forwarded-for": "198.51.100.8, 10.0.0.1" },
    });
    const local = new NextRequest("http://localhost/api/vision/generate");

    expect(getGenerationRateLimitKey(proxied)).toBe("ip:203.0.113.10");
    expect(getGenerationRateLimitKey(forwardedOnly)).toBe("ip:198.51.100.8");
    expect(getGenerationRateLimitKey(local)).toBe("ip:local");
  });

  it("does not store prompts, secrets, or free-form request content", () => {
    checkGenerationRateLimit("ip:203.0.113.10", CONFIG, 1_000);
    const serializedState = JSON.stringify(getGenerationRateLimitStoreSnapshot());

    expect(serializedState).not.toContain("Idea confidencial");
    expect(serializedState).not.toContain("sk-");
    expect(serializedState).not.toContain("OPENROUTER_API_KEY");
  });

  it("uses safe defaults and ignores out-of-range environment values", () => {
    const config = getGenerationRateLimitConfig({
      VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS: "0",
      VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS: "999999",
      VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS: "1",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({ limit: 10, windowMs: 60_000, maxKeys: 1000 });
  });
});
