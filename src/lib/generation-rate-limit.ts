import type { NextRequest } from "next/server";

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_MAX_KEYS = 1000;
const MIN_LIMIT = 1;
const MAX_LIMIT = 1000;
const MIN_WINDOW_SECONDS = 1;
const MAX_WINDOW_SECONDS = 3600;
const MIN_MAX_KEYS = 10;
const MAX_MAX_KEYS = 100_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
  lastSeenAt: number;
}

export interface GenerationRateLimitConfig {
  limit: number;
  windowMs: number;
  maxKeys: number;
  trustProxyHeaders: boolean;
}

export interface GenerationRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

const store = new Map<string, RateLimitEntry>();

export function getGenerationRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env
): GenerationRateLimitConfig {
  return {
    limit: readIntegerEnv(
      env.VISIONFLOW_GENERATE_RATE_LIMIT_REQUESTS,
      DEFAULT_LIMIT,
      MIN_LIMIT,
      MAX_LIMIT
    ),
    windowMs:
      readIntegerEnv(
        env.VISIONFLOW_GENERATE_RATE_LIMIT_WINDOW_SECONDS,
        DEFAULT_WINDOW_SECONDS,
        MIN_WINDOW_SECONDS,
        MAX_WINDOW_SECONDS
      ) * 1000,
    maxKeys: readIntegerEnv(
      env.VISIONFLOW_GENERATE_RATE_LIMIT_MAX_KEYS,
      DEFAULT_MAX_KEYS,
      MIN_MAX_KEYS,
      MAX_MAX_KEYS
    ),
    trustProxyHeaders: env.VISIONFLOW_TRUST_PROXY_HEADERS === "true",
  };
}

export function getGenerationRateLimitKey(
  req: NextRequest,
  config: Pick<GenerationRateLimitConfig, "trustProxyHeaders"> = getGenerationRateLimitConfig()
): string {
  return `ip:${getClientIp(req, config.trustProxyHeaders)}`;
}

export function checkGenerationRateLimit(
  key: string,
  config: GenerationRateLimitConfig = getGenerationRateLimitConfig(),
  now = Date.now()
): GenerationRateLimitResult {
  cleanupExpiredEntries(now);
  ensureCapacityForKey(key, config.maxKeys);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
      lastSeenAt: now,
    });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  existing.lastSeenAt = now;
  if (existing.count >= config.limit) {
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function resetGenerationRateLimitStore(): void {
  store.clear();
}

export function getGenerationRateLimitStoreSnapshot(): Array<{
  key: string;
  count: number;
  resetAt: number;
  lastSeenAt: number;
}> {
  return Array.from(store.entries()).map(([key, value]) => ({
    key,
    count: value.count,
    resetAt: value.resetAt,
    lastSeenAt: value.lastSeenAt,
  }));
}

function getClientIp(req: NextRequest, trustProxyHeaders: boolean): string {
  if (!trustProxyHeaders) {
    return "direct";
  }

  const realIp = normalizeIp(req.headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0];
  const forwardedIp = normalizeIp(firstForwardedIp);
  if (forwardedIp) {
    return forwardedIp;
  }

  return "local";
}

function normalizeIp(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/^\[|\]$/g, "");
}

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

function ensureCapacityForKey(key: string, maxKeys: number): void {
  if (store.has(key) || store.size < maxKeys) {
    return;
  }

  let oldestKey: string | null = null;
  let oldestSeenAt = Number.POSITIVE_INFINITY;
  for (const [candidateKey, entry] of store.entries()) {
    if (entry.lastSeenAt < oldestSeenAt) {
      oldestSeenAt = entry.lastSeenAt;
      oldestKey = candidateKey;
    }
  }

  if (oldestKey) {
    store.delete(oldestKey);
  }
}

function readIntegerEnv(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}
