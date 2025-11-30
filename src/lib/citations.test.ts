import { describe, expect, it } from "vitest";

import { normalizeSummaryCitations } from "./citations";

describe("normalizeSummaryCitations", () => {
  it("returns an empty array when no citations are provided", () => {
    expect(normalizeSummaryCitations(null)).toEqual([]);
    expect(normalizeSummaryCitations(undefined)).toEqual([]);
  });

  it("deduplicates and normalizes array-based citations", () => {
    const raw = [
      "https://example.com/a",
      { url: "https://example.com/b", label: "Source B" },
      { source: "https://example.com/a", title: "Duplicate" },
      "",
    ];

    const result = normalizeSummaryCitations(raw);

    expect(result).toEqual([
      { url: "https://example.com/a", label: "https://example.com/a" },
      { url: "https://example.com/b", label: "Source B" },
    ]);
  });

  it("supports object maps and preserves insertion order while deduplicating", () => {
    const raw = {
      primary: "https://example.com/a",
      backup: { url: "https://example.com/b", title: "Backup" },
      duplicate: { url: "https://example.com/a", label: "Alt" },
      invalid: { url: "", label: "Ignore" },
    } as const;

    const result = normalizeSummaryCitations(raw);

    expect(result).toEqual([
      { url: "https://example.com/a", label: "primary" },
      { url: "https://example.com/b", label: "Backup" },
    ]);
  });
});
