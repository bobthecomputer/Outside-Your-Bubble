import { type Source, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { fetchArxivItems } from "./arxiv";
import { fetchRssItems } from "./rss";
import type { IngestResult, NormalizedItem } from "./types";
import { canonicalizeUrl, hashText } from "./utils";

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
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const itemIds: string[] = [];

  for (const item of normalized) {
    const url = canonicalizeUrl(item.url);
    const hash = hashText(item.text);
    const existing = await prisma.item.findFirst({
      where: { OR: [{ url }, { hash }] },
    });

    if (existing) {
      const changed = existing.hash !== hash || existing.text !== item.text;
      if (changed) {
        const updatedItem = await prisma.item.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            author: item.author,
            publishedAt: item.publishedAt,
            lang: item.language,
            tags: item.tags,
            text: item.text,
            hash,
            provenance: item.provenance,
            tier: item.tier,
          },
        });
        itemIds.push(updatedItem.id);
        updated += 1;
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
        hash,
        provenance: item.provenance,
        tier: item.tier,
        status: VerificationStatus.DEVELOPING,
        source: {
          connect: { id: source.id },
        },
      },
    });
    itemIds.push(createdItem.id);
    created += 1;
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

export async function ensureSource(url: string, type: string, title?: string) {
  const existing = await prisma.source.findUnique({ where: { url } });
  if (existing) return existing;
  return prisma.source.create({
    data: {
      url,
      type,
      title,
    },
  });
}
