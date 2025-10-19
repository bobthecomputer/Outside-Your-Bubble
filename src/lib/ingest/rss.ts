import { XMLParser } from "fast-xml-parser";
import type { Source } from "@prisma/client";
import { NormalizedItem } from "./types";
import { canonicalizeUrl } from "./utils";
import { rssSample } from "./sample-data";
import { logger } from "@/lib/logger";
import { scrapeArticle, normalizeScrapedItem } from "./scraper";

const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
interface RssCategoryValue {
  '#text'?: string;
}

interface RssEntry {
  link?: string | { '@_href'?: string };
  guid?: string | { '#text'?: string };
  title?: string;
  description?: string;
  summary?: string;
  author?: string;
  'dc:creator'?: string;
  pubDate?: string;
  category?: string | string[] | RssCategoryValue | RssCategoryValue[];
}

function ensureString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export async function fetchRssItems(source: Source): Promise<NormalizedItem[]> {
  let xml: string | null = null;
  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed ${source.url}: ${response.status}`);
    }
    xml = await response.text();
  } catch (error) {
    logger.warn({ error }, "ingest:rss-fallback");
    return [
      {
        source: { id: source.id, type: source.type, url: source.url },
        ...rssSample,
      },
    ];
  }

  if (!xml) {
    return [
      {
        source: { id: source.id, type: source.type, url: source.url },
        ...rssSample,
      },
    ];
  }

  const parsed = parser.parse(xml);
  const entries = parsed.rss?.channel?.item || parsed.feed?.entry || [];
  const normalized: RssEntry[] = Array.isArray(entries) ? (entries as RssEntry[]) : [entries as RssEntry];

  const items: NormalizedItem[] = [];
  for (const entry of normalized) {
    const linkField = typeof entry.link === "object" && entry.link ? (entry.link as { "@_href"?: string })?.["@_href"] : ensureString(entry.link);
    const guidField = typeof entry.guid === "object" && entry.guid ? (entry.guid as { "#text"?: string })?.["#text"] : ensureString(entry.guid);
    const url = linkField ?? guidField;
    if (!url) continue;
    const canonicalUrl = canonicalizeUrl(url);
    const scrape = await scrapeArticle(canonicalUrl, {
      languageHint: ensureString(parsed.rss?.channel?.language) ?? source.primaryLanguage ?? source.title,
      via: "rss",
    });
    if (!scrape) {
      continue;
    }

    const normalized = await normalizeScrapedItem(scrape, {
      id: source.id,
      type: source.type,
      url: source.url,
    });

    const tags: string[] = Array.isArray(entry.category)
      ? (entry.category as Array<string | RssCategoryValue>)
          .map((value) => {
            if (typeof value === "string") return value;
            return ensureString(value?.["#text"]);
          })
          .filter((value): value is string => Boolean(value))
      : typeof entry.category === "object" && entry.category
        ? [ensureString((entry.category as RssCategoryValue)["#text"])].filter((value): value is string => Boolean(value))
        : ensureString(entry.category)
          ? [entry.category as string]
          : [];

    const mergedTags = new Set<string>([...normalized.tags, ...tags]);

    items.push({
      ...normalized,
      author: ensureString(entry.author) ?? ensureString(entry["dc:creator"]) ?? undefined,
      publishedAt: entry.pubDate ? new Date(entry.pubDate) : undefined,
      tags: Array.from(mergedTags),
    });
  }

  return items;
}
