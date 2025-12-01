import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scoreArticleQualityWithModel } from "@/lib/ingest/classifier";

describe("scoreArticleQualityWithModel", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, QUALITY_MODEL_URL: "https://example.com/score" };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it("returns model score when API responds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ score: 72, reasons: ["model"], verdict: "good" }),
    } as Response);

    const result = await scoreArticleQualityWithModel({ text: "content" });
    expect(result?.score).toBe(72);
    expect(result?.verdict).toBe("good");
  });

  it("falls back to null when API fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    const result = await scoreArticleQualityWithModel({ text: "content" });
    expect(result).toBeNull();
  });
});
