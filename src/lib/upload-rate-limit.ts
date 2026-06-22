/**
 * Rate limiting for map export uploads
 * Default: 5 uploads per map per user per hour
 */

interface UploadRateLimitEntry {
  count: number;
  resetAt: number;
  lastSeenAt: number;
}

export interface UploadRateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface UploadRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_SECONDS = 3600; // 1 hour

const store = new Map<string, UploadRateLimitEntry>();

export function getUploadRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env
): UploadRateLimitConfig {
  const limitStr = env.VISIONFLOW_UPLOAD_RATE_LIMIT_REQUESTS || String(DEFAULT_LIMIT);
  const windowStr = env.VISIONFLOW_UPLOAD_RATE_LIMIT_WINDOW_SECONDS || String(DEFAULT_WINDOW_SECONDS);

  const limit = Math.max(1, Math.min(1000, parseInt(limitStr, 10) || DEFAULT_LIMIT));
  const windowMs = (Math.max(1, Math.min(86400, parseInt(windowStr, 10) || DEFAULT_WINDOW_SECONDS)) * 1000);

  return { limit, windowMs };
}

export function getUploadRateLimitKey(mapId: string, workspaceId: string): string {
  return `upload:${workspaceId}:${mapId}`;
}

export function checkUploadRateLimit(
  key: string,
  config: UploadRateLimitConfig = getUploadRateLimitConfig(),
  now = Date.now()
): UploadRateLimitResult {
  cleanupExpiredEntries(now);

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

export function resetUploadRateLimitStore(): void {
  store.clear();
}

export function getUploadRateLimitStoreSnapshot(): Array<{
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

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
