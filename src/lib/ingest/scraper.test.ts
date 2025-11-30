import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getExternalExtractors, scrapeWithExternalExtractors } from "@/lib/ingest/scraper";

const ORIGINAL_ENV = { ...process.env };

describe("scrapeWithExternalExtractors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefers the Jina reader markdown fallback when enabled", async () => {
    process.env.INGEST_ENABLE_JINA_READER = "true";
    const markdown = `# Headline\n\n> Summary block quote for context.\n\n${"Content paragraph ".repeat(30)}`;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, text: async () => markdown, headers: new Headers() } as Response);

    const result = await scrapeWithExternalExtractors("https://example.com/story");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://r.jina.ai/http://example.com/story",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result?.channel).toBe("jina-reader");
    expect(result?.title).toBe("Headline");
    expect(result?.excerpt).toBe("Summary block quote for context.");
    expect(result?.text?.length).toBeGreaterThan(180);
  });

  it("uses a configured external article API when provided", async () => {
    process.env.INGEST_ENABLE_JINA_READER = "false";
    process.env.INGEST_ARTICLE_API_URL = "https://api.example.com/extract?target={url}";
    process.env.INGEST_ARTICLE_API_KEY = "secret";
    const jsonPayload = {
      title: "API Title",
      content: `<p>${"A long article body. ".repeat(20)}</p>`,
      excerpt: "A short excerpt",
      siteName: "Example News",
      tags: ["news", "world"],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => jsonPayload,
    } as Response);

    const result = await scrapeWithExternalExtractors("https://news.site/story");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/extract?target=https%3A%2F%2Fnews.site%2Fstory",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result?.channel).toBe("external-api");
    expect(result?.title).toBe("API Title");
    expect(result?.metadata?.siteName).toBe("Example News");
    expect(result?.metadata?.tags).toEqual(["news", "world"]);
    expect(result?.text?.length).toBeGreaterThan(180);
  });

  it("returns no extractors when everything is disabled", () => {
    process.env.INGEST_ENABLE_JINA_READER = "false";
    delete process.env.INGEST_ARTICLE_API_URL;
    const extractors = getExternalExtractors();
    expect(extractors).toHaveLength(0);
  });
});

