import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { applyRateLimit, rateLimitExceededResponse, resetRateLimitMemory } from "./rate-limit";

describe("applyRateLimit (memory fallback)", () => {
  beforeEach(() => {
    resetRateLimitMemory();
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    resetRateLimitMemory();
    vi.useRealTimers();
  });

  it("permits requests within the window and blocks once the cap is exceeded", async () => {
    const key = "test:window";

    for (let index = 0; index < 3; index += 1) {
      const result = await applyRateLimit(key, 1_000, 3);
      expect(result.success).toBe(true);
    }

    const limited = await applyRateLimit(key, 1_000, 3);
    expect(limited.success).toBe(false);
    if (!limited.success) {
      expect(limited.retryAfter).toBeGreaterThan(0);
    }
  });

  it("resets after the window elapses", async () => {
    const key = "test:reset";
    await applyRateLimit(key, 1_000, 1);

    vi.setSystemTime(2_000);

    const result = await applyRateLimit(key, 1_000, 1);
    expect(result.success).toBe(true);
  });
});

describe("rateLimitExceededResponse", () => {
  it("returns a standardized 429 response with retry headers", async () => {
    const response = rateLimitExceededResponse(
      { success: false, retryAfter: 42 },
      "Slow down",
      "too_many_requests",
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("42");

    const payload = (await response?.json()) as { error: { code: string; message: string }; retryAfter: number; message?: string };
    expect(payload).toEqual({
      error: { code: "too_many_requests", message: "Slow down" },
      retryAfter: 42,
      message: "Slow down",
    });
  });
});
