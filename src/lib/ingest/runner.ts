import { ensureSource, ingestSource } from "@/lib/ingest";
import { summarizeItem } from "@/lib/summarizer";
import { verifyItem } from "@/lib/verification";
import { applyDomainLens } from "@/lib/lenses";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { scoreArticleQuality, scoreArticleQualityWithModel } from "@/lib/ingest/classifier";

export type IngestSourceConfig = {
  url: string;
  type: string;
  title: string;
  metadata?: Record<string, unknown>;
};

export function parseSourcesFromEnv(): IngestSourceConfig[] {
  const raw = process.env.INGEST_SOURCES_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (entry): entry is IngestSourceConfig =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { url?: unknown }).url === "string" &&
            typeof (entry as { type?: unknown }).type === "string" &&
            typeof (entry as { title?: unknown }).title === "string",
        );
      }
    } catch (error) {
      logger.warn({ error }, "Failed to parse INGEST_SOURCES_JSON; falling back to defaults.");
    }
  }

  return [
    {
      url: "https://feeds.npr.org/1001/rss.xml",
      type: "rss",
      title: "NPR News",
      metadata: { countryCode: "US", primaryLanguage: "en" },
    },
    {
      url: "https://www.tagesschau.de/xml/rss2/",
      type: "rss",
      title: "Tagesschau Politik",
      metadata: { countryCode: "DE", primaryLanguage: "de" },
    },
  ];
}

async function classifyItems(itemIds: string[]) {
  for (const itemId of itemIds) {
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) continue;
    const baseScore = scoreArticleQuality({
      title: item.title,
      summary: item.summary,
      text: item.content,
      tags: item.tags as string[] | null,
      language: item.language,
      source: item.sourceUrl,
    });
    const modelScore = await scoreArticleQualityWithModel({
      title: item.title ?? undefined,
      summary: item.summary ?? undefined,
      text: item.content ?? undefined,
      tags: (item.tags as string[] | null) ?? undefined,
      language: item.language ?? undefined,
    });
    const finalScore = modelScore ?? baseScore;
    logger.info({ itemId, score: finalScore, baseScore, modelUsed: Boolean(modelScore) }, "classified-article");
    if (itemId && typeof finalScore.score === "number") {
      await prisma.item.update({
        where: { id: itemId },
        data: {
          qualityScore: finalScore.score,
          qualityVerdict: finalScore.verdict,
          qualityReasons: finalScore.reasons,
        },
      });
    }
  }
}

export async function runIngestionBatch(sources: IngestSourceConfig[]) {
  for (const source of sources) {
    const ensured = await ensureSource(source.url, source.type, source.title, source.metadata ?? {});
    const result = await ingestSource(ensured.id);
    logger.info({ source: source.url, result }, "ingest-runner:ingested");
    for (const itemId of result.itemIds) {
      await summarizeItem(itemId);
      await verifyItem(itemId);
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      await applyDomainLens(itemId, item?.tags ?? []);
    }
    await classifyItems(result.itemIds);
  }
}
