import { describe, expect, it } from "vitest";

import { scoreArticleQuality } from "@/lib/ingest/classifier";

describe("scoreArticleQuality", () => {
  it("favors long bodies with summaries and tags", () => {
    const result = scoreArticleQuality({
      title: "Long form report",
      summary: "A detailed summary of events across regions and actors involved.",
      text: "word ".repeat(500),
      tags: ["politics", "economy", "climate"],
      language: "en",
    });

    expect(result.verdict).toBe("good");
    expect(result.score).toBeGreaterThan(60);
  });

  it("flags thin content for review", () => {
    const result = scoreArticleQuality({
      title: "Short blurb",
      summary: "Tiny",
      text: "Headline only text with a few extra words to avoid total rejection.",
      tags: ["misc"],
      language: "en",
    });

    expect(result.verdict).toBe("needs_review");
  });

  it("rejects missing body", () => {
    const result = scoreArticleQuality({
      title: "",
      summary: "",
      text: "",
      tags: [],
      language: null,
    });

    expect(result.verdict).toBe("reject");
  });
});
