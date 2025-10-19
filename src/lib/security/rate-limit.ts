const hits = new Map<string, number[]>();

export type RateLimitResult = {
  success: boolean;
  retryAfter?: number;
};

export function applyRateLimit(key: string, windowMs: number, max: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = hits.get(key)?.filter((timestamp) => timestamp > windowStart) ?? [];
  existing.push(now);
  hits.set(key, existing);

  if (existing.length > max) {
    const earliest = existing[0];
    const retryAfterMs = earliest + windowMs - now;
    return {
      success: false,
      retryAfter: retryAfterMs > 0 ? Math.ceil(retryAfterMs / 1000) : 1,
    };
  }

  return { success: true };
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, timestamps] of hits.entries()) {
    const filtered = timestamps.filter((timestamp) => now - timestamp < 5 * 60 * 1000);
    if (filtered.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, filtered);
    }
  }
}

type Handler<T> = (request: Request) => Promise<T>;

export function withRateLimit<T>(handler: Handler<T>, windowMs = 30_000, max = 40) {
  return async (request: Request): Promise<T> => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const path = new URL(request.url).pathname;
    const key = `${ip}:${path}`;
    const result = applyRateLimit(key, windowMs, max);
    if (!result.success) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: result.retryAfter
          ? { "Retry-After": String(result.retryAfter) }
          : undefined,
      }) as unknown as T;
    }
    return handler(request);
  };
}
