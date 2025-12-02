import type { Redis } from "ioredis";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getRedisClient } from "@/lib/redis";
import { buildRateLimitKey } from "@/lib/security/request";

export type RateLimitResult =
  | { success: true }
  | { success: false; retryAfter: number };

export type RateLimitErrorBody = {
  error: { code: string; message: string };
  retryAfter?: number;
  message?: string;
};

const memoryHits = new Map<string, number[]>();
const redisPrefix = "oyb:ratelimit";

function applyMemoryRateLimit(key: string, windowMs: number, max: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const entries = memoryHits.get(key)?.filter((timestamp) => timestamp > windowStart) ?? [];
  entries.push(now);
  memoryHits.set(key, entries);

  if (entries.length > max) {
    const earliest = entries[0];
    const retryAfterMs = earliest + windowMs - now;
    return {
      success: false,
      retryAfter: retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1000) : 1,
    };
  }

  return { success: true };
}

async function applyRedisRateLimit(redis: Redis, key: string, windowMs: number, max: number): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `${redisPrefix}:${key}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const results = await redis
    .multi()
    .zremrangebyscore(redisKey, 0, windowStart)
    .zadd(redisKey, now, member)
    .zcard(redisKey)
    .pexpire(redisKey, windowMs + 1000)
    .exec();

  const count = results?.[2]?.[1];
  if (typeof count !== "number") {
    throw new Error("rate_limit:redis-count-missing");
  }

  if (count <= max) {
    return { success: true };
  }

  const earliest = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
  const earliestScore = earliest.length >= 2 ? Number(earliest[1]) : now;
  const retryAfter = Math.max(1, Math.ceil((earliestScore + windowMs - now) / 1000));

  return { success: false, retryAfter };
}

export async function applyRateLimit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return applyMemoryRateLimit(key, windowMs, max);
  }

  try {
    return await applyRedisRateLimit(redis, key, windowMs, max);
  } catch (error) {
    logger.warn({ error, key }, "rate-limit:redis-fallback");
    return applyMemoryRateLimit(key, windowMs, max);
  }
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  message = "Too many requests",
  code = "rate_limited",
) {
  if (result.success) return null;
  const retryAfter = Math.max(1, Math.ceil(result.retryAfter));
  return NextResponse.json<RateLimitErrorBody>(
    {
      error: { code, message },
      retryAfter,
      message,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

type Handler<T> = (request: Request) => Promise<T>;

type WithRateLimitOptions = {
  scope?: string;
  windowMs?: number;
  max?: number;
  message?: string;
  code?: string;
};

export function withRateLimit<T>(handler: Handler<T>, options?: WithRateLimitOptions) {
  return async (request: Request): Promise<T | NextResponse> => {
    const scope = options?.scope ?? (new URL(request.url).pathname || "api");
    const key = buildRateLimitKey(request, scope);
    const result = await applyRateLimit(key, options?.windowMs ?? 30_000, options?.max ?? 40);
    const response = rateLimitExceededResponse(result, options?.message, options?.code);
    if (response) {
      return response as unknown as T;
    }
    return handler(request);
  };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, timestamps] of memoryHits.entries()) {
    const filtered = timestamps.filter((timestamp) => now - timestamp < 5 * 60 * 1000);
    if (filtered.length === 0) {
      memoryHits.delete(key);
    } else {
      memoryHits.set(key, filtered);
    }
  }
}

export function resetRateLimitMemory() {
  memoryHits.clear();
}
