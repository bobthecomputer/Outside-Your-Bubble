import type { Item, Summary, Verification, Source, Topic } from "@prisma/client";
import { normalizeSummaryCitations } from "./citations";
import { prisma } from "./prisma";

export type BriefCitation = {
  url: string;
  label: string;
};

export type BriefItem = {
  id: string;
  title: string;
  headline: string;
  bullets: string[];
  tier: Item["tier"];
  citations: BriefCitation[];
  whyShown: string;
  publishedAt?: string;
  source: { title?: string | null; url: string };
  topic?: { slug: string; label: string } | null;
};

export type MorningBrief = {
  generatedAt: string;
  items: BriefItem[];
};

type ItemWithRelations = Item & {
  summary: Summary | null;
  verification: Verification | null;
  source: Source;
  topic: Topic | null;
};

function summarizeWhy(item: ItemWithRelations): string {
  if (item.topic) {
    return `Fresh on ${item.topic.label}`;
  }

  const topicalTags = item.tags.filter((tag) => !tag.startsWith("region:"));
  if (topicalTags.length > 0) {
    return `Relevant to ${topicalTags.slice(0, 2).join(", ")}`;
  }

  const regions = item.tags.filter((tag) => tag.startsWith("region:"));
  if (regions.length > 0) {
    const formatted = regions.map((region) => region.replace("region:", ""));
    return `Regional update: ${formatted.join(", ")}`;
  }

  return "High-signal development";
}

function normalizeBriefItem(item: ItemWithRelations): BriefItem | null {
  const summary = item.summary;
  if (!summary) return null;

  const headline = summary.headline ?? item.title ?? item.url;
  const bullets = (summary.bullets ?? []).filter((bullet): bullet is string => typeof bullet === "string").slice(0, 4);
  if (bullets.length === 0) return null;

  const citations = normalizeSummaryCitations(summary.citations).slice(0, 2);

  return {
    id: item.id,
    title: item.title ?? headline,
    headline,
    bullets,
    tier: item.tier,
    citations,
    whyShown: summarizeWhy(item),
    publishedAt: item.publishedAt?.toISOString(),
    source: { title: item.source.title, url: item.url },
    topic: item.topic ? { slug: item.topic.slug, label: item.topic.label } : null,
  };
}

export async function buildMorningBrief(at: Date = new Date()): Promise<MorningBrief> {
  const candidates = await prisma.item.findMany({
    where: {
      publishedAt: {
        lte: at,
      },
      summary: {
        isNot: null,
      },
    },
    include: {
      summary: true,
      verification: true,
      source: true,
      topic: true,
    },
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 36,
  });

  const seen = new Set<string>();
  const items: BriefItem[] = [];

  for (const candidate of candidates) {
    const key = candidate.hash ?? candidate.summary?.headline ?? candidate.url;
    if (key && seen.has(key)) {
      continue;
    }

    const normalized = normalizeBriefItem(candidate);
    if (!normalized) continue;

    if (key) {
      seen.add(key);
    }

    items.push(normalized);
    if (items.length >= 6) {
      break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    items,
  };
}
