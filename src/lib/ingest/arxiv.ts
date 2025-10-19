import { XMLParser } from "fast-xml-parser";
import type { Source } from "@prisma/client";
import { extract } from "@extractus/article-extractor";
import { NormalizedItem } from "./types";
import { canonicalizeUrl, inferRegionTag } from "./utils";
import { extractKeywords } from "./novelty";
import { arxivSample } from "./sample-data";
import { logger } from "@/lib/logger";

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

interface ArxivAuthor {
  name?: string;
}

interface ArxivLink {
  '@_href'?: string;
}

interface ArxivCategory {
  '@_term'?: string;
}

interface ArxivEntry {
  id?: string;
  link?: ArxivLink | ArxivLink[];
  summary?: string;
  title?: string;
  published?: string;
  author?: ArxivAuthor | ArxivAuthor[];
  category?: ArxivCategory | ArxivCategory[];
}

export async function fetchArxivItems(source: Source): Promise<NormalizedItem[]> {
  let xml: string | null = null;
  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch arXiv feed ${source.url}: ${response.status}`);
    }
    xml = await response.text();
  } catch (error) {
    logger.warn({ error }, "ingest:arxiv-fallback");
    return [
      {
        source: { id: source.id, type: source.type, url: source.url },
        ...arxivSample,
      },
    ];
  }

  if (!xml) {
    return [{ source: { id: source.id, type: source.type, url: source.url }, ...arxivSample }];
  }
  const parsed = parser.parse(xml);
  const rawEntries = Array.isArray(parsed.feed?.entry)
    ? (parsed.feed.entry as ArxivEntry[])
    : parsed.feed?.entry
      ? [parsed.feed.entry as ArxivEntry]
      : [];

  const items: NormalizedItem[] = [];
  for (const entry of rawEntries) {
    const linkField = Array.isArray(entry.link) ? entry.link[0] : entry.link;
    const url: string | undefined = entry.id ?? linkField?.["@_href"];
    if (!url) continue;
    const canonicalUrl = canonicalizeUrl(url);
    const summary: string = typeof entry.summary === "string" ? entry.summary : "";
    const content = await extract(canonicalUrl).catch(() => null);
    const text = content?.content ?? summary ?? "";

    if (!text) {
      continue;
    }

    const publishedAt = entry.published ? new Date(entry.published) : undefined;
    const authors = Array.isArray(entry.author)
      ? entry.author
          .map((a) => a?.name)
          .filter((name): name is string => Boolean(name))
          .join(", ")
      : entry.author?.name ?? undefined;

    const baseTags = Array.isArray(entry.category)
      ? entry.category
          .map((category) => category?.["@_term"])
          .filter((term): term is string => Boolean(term))
      : entry.category?.["@_term"]
        ? [entry.category["@_term"] as string]
        : [];
    const regionTag = inferRegionTag(source.url);
    if (regionTag && !baseTags.includes(regionTag)) {
      baseTags.push(regionTag);
    }

    const keywords = extractKeywords(text, 25);

    items.push({
      source: { id: source.id, type: source.type, url: source.url },
      url: canonicalUrl,
      title: entry.title ?? "Untitled arXiv submission",
      author: authors,
      publishedAt,
      language: "en",
      tags: baseTags,
      text,
      keywords,
      tier: "T1b",
      provenance: {
        tier: "T1b",
        provider: "arXiv",
        categories: baseTags.filter((tag) => !tag.startsWith("region:")),
      },
    });
  }

  return items;
}
