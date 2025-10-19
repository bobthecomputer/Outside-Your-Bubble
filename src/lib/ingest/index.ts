import { type Source, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { fetchArxivItems } from "./arxiv";
import { fetchRssItems } from "./rss";
import type { IngestResult, NormalizedItem } from "./types";
import { canonicalizeUrl, hashText } from "./utils";
import { buildNoveltyContext, scoreNovelty, updateNoveltyContext } from "./novelty";

const handlers: Record<string, (source: Source) => Promise<NormalizedItem[]>> = {
  arxiv: fetchArxivItems,
  rss: fetchRssItems,
};

export async function ingestSource(sourceId: string): Promise<IngestResult> {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }
  const typeKey = source.type.toLowerCase();
  const handler = handlers[typeKey];
  if (!handler) {
    throw new Error(`No ingestion handler for source type ${source.type}`);
  }

  const normalized = await handler(source);
  const noveltyContext = await buildNoveltyContext();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const itemIds: string[] = [];

  for (const item of normalized) {
    const url = canonicalizeUrl(item.url);
    const baseText = item.text ?? item.originalText ?? "";
    const hash = hashText(baseText);
    const novelty = scoreNovelty(baseText, noveltyContext, item.keywords);
    const existing = await prisma.item.findFirst({
      where: { OR: [{ url }, { hash }] },
    });

    if (existing) {
      const changed = existing.hash !== hash || existing.text !== item.text;
      const needsNoveltyRefresh =
        existing.noveltyScore === null ||
        typeof existing.noveltyScore === "undefined" ||
        !Array.isArray(existing.noveltyAngles) ||
        existing.noveltyAngles.length === 0;

      if (changed || needsNoveltyRefresh) {
        const updatedItem = await prisma.item.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            author: item.author,
            publishedAt: item.publishedAt,
            lang: item.language,
            tags: item.tags,
            text: item.text,
            originalText: item.originalText,
            hash,
            provenance: item.provenance,
            tier: item.tier,
            noveltyScore: novelty.score,
            noveltyAngles: novelty.angles,
            translationProvider: item.translationProvider,
            contextSummary: item.contextSummary,
            contextBullets: item.contextBullets ?? [],
            studyPrompts: item.studyPrompts ?? [],
            channels: item.channels ?? [],
            excerpt: item.excerpt,
            contextMetadata: item.contextMetadata ?? null,
          },
        });
        itemIds.push(updatedItem.id);
        updated += 1;
        updateNoveltyContext(noveltyContext, novelty.keywords);
      } else {
        skipped += 1;
      }
      continue;
    }

    const createdItem = await prisma.item.create({
      data: {
        url,
        title: item.title,
        author: item.author,
        publishedAt: item.publishedAt,
        lang: item.language,
        tags: item.tags,
        text: item.text,
        originalText: item.originalText,
        hash,
        provenance: item.provenance,
        tier: item.tier,
        status: VerificationStatus.DEVELOPING,
        noveltyScore: novelty.score,
        noveltyAngles: novelty.angles,
        translationProvider: item.translationProvider,
        contextSummary: item.contextSummary,
        contextBullets: item.contextBullets ?? [],
        studyPrompts: item.studyPrompts ?? [],
        channels: item.channels ?? [],
        excerpt: item.excerpt,
        contextMetadata: item.contextMetadata ?? null,
        source: {
          connect: { id: source.id },
        },
      },
    });
    itemIds.push(createdItem.id);
    created += 1;
    updateNoveltyContext(noveltyContext, novelty.keywords);
  }

  logger.info(
    {
      source: source.url,
      type: source.type,
      created,
      updated,
      skipped,
    },
    "ingest:complete",
  );

  return { created, updated, skipped, itemIds };
}

export async function ensureSource(
  url: string,
  type: string,
  title?: string,
  metadata: { countryCode?: string | null; primaryLanguage?: string | null } = {},
) {
  const existing = await prisma.source.findUnique({ where: { url } });
  if (existing) {
    const needsUpdate =
      (title && existing.title !== title) ||
      (typeof metadata.countryCode !== "undefined" && existing.countryCode !== metadata.countryCode) ||
      (typeof metadata.primaryLanguage !== "undefined" && existing.primaryLanguage !== metadata.primaryLanguage) ||
      existing.type !== type;

    if (needsUpdate) {
      const updated = await prisma.source.update({
        where: { id: existing.id },
        data: {
          type,
          title: title ?? existing.title,
          countryCode: metadata.countryCode ?? existing.countryCode,
          primaryLanguage: metadata.primaryLanguage ?? existing.primaryLanguage,
        },
      });
      return updated;
    }

    return existing;
  }

  return prisma.source.create({
    data: {
      url,
      type,
      title,
      countryCode: metadata.countryCode ?? null,
      primaryLanguage: metadata.primaryLanguage ?? null,
    },
  });
}
