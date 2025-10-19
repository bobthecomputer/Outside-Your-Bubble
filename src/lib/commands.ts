import { ensureSource, ingestSource } from "@/lib/ingest";
import { summarizeItem } from "@/lib/summarizer";
import { verifyItem } from "@/lib/verification";
import { applyDomainLens } from "@/lib/lenses";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function handleIngestSample() {
  const sources = await Promise.all([
    ensureSource(
      "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=2&sortBy=lastUpdatedDate&sortOrder=descending",
      "arxiv",
      "arXiv CS.AI latest",
      { countryCode: "GLOBAL", primaryLanguage: "en" },
    ),
    ensureSource("https://feeds.npr.org/1001/rss.xml", "rss", "NPR News", { countryCode: "US", primaryLanguage: "en" }),
    ensureSource("https://www.tagesschau.de/xml/rss2/", "rss", "Tagesschau Politik", {
      countryCode: "DE",
      primaryLanguage: "de",
    }),
  ]);

  let processed = 0;
  for (const source of sources) {
    const result = await ingestSource(source.id);
    processed += result.itemIds.length;
    for (const itemId of result.itemIds) {
      await summarizeItem(itemId);
      await verifyItem(itemId);
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      await applyDomainLens(itemId, item?.tags ?? []);
    }
  }
  return `Ingested ${processed} items`;
}

async function handleSummarizePending() {
  const items = await prisma.item.findMany({ where: { summary: null }, select: { id: true }, take: 25 });
  for (const item of items) {
    await summarizeItem(item.id);
  }
  return `Summarized ${items.length} items`;
}

async function handleVerifyPending() {
  const items = await prisma.item.findMany({ where: { verification: null }, select: { id: true }, take: 25 });
  for (const item of items) {
    await verifyItem(item.id);
  }
  return `Verified ${items.length} items`;
}

async function handleRankTrain() {
  const counts = await prisma.item.count();
  logger.info({ counts }, "rank:train:stub");
  return "Ranking policy training stub executed";
}

async function handleFeedbackReport() {
  const groups = await prisma.feedback.groupBy({ by: ["signal"], _count: { _all: true } });
  return `Feedback signals: ${groups.map((g) => `${g.signal}:${g._count._all}`).join(", ") || "none"}`;
}

export async function runCommand(command: string) {
  switch (command) {
    case "ingest:sample":
      return handleIngestSample();
    case "summarize:pending":
      return handleSummarizePending();
    case "verify:pending":
      return handleVerifyPending();
    case "rank:train":
      return handleRankTrain();
    case "feedback:report":
      return handleFeedbackReport();
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
