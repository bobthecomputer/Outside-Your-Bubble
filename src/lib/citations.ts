import type { Summary } from "@prisma/client";

export type NormalizedCitation = {
  url: string;
  label: string;
};

function addCitation(
  citations: NormalizedCitation[],
  seen: Set<string>,
  url: unknown,
  label: unknown,
) {
  if (typeof url !== "string" || url.length === 0) return;
  if (seen.has(url)) return;
  const normalizedLabel = typeof label === "string" && label.length > 0 ? label : url;
  citations.push({ url, label: normalizedLabel });
  seen.add(url);
}

export function normalizeSummaryCitations(raw: Summary["citations"] | null | undefined): NormalizedCitation[] {
  if (!raw) return [];
  const citations: NormalizedCitation[] = [];
  const seen = new Set<string>();

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string") {
        addCitation(citations, seen, entry, entry);
      } else if (entry && typeof entry === "object") {
        const record = entry as { url?: unknown; title?: unknown; label?: unknown; source?: unknown };
        addCitation(
          citations,
          seen,
          record.url ?? record.source,
          record.label ?? record.title ?? record.url ?? record.source,
        );
      }
    }
    return citations;
  }

  if (typeof raw === "object") {
    const record = raw as { [key: string]: unknown };
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (typeof value === "string") {
        addCitation(citations, seen, value, key);
      } else if (value && typeof value === "object") {
        const inner = value as { url?: unknown; title?: unknown; label?: unknown };
        addCitation(citations, seen, inner.url, inner.label ?? inner.title ?? inner.url);
      }
    }
  }

  return citations;
}
