import "dotenv/config";
import { ensureSource, ingestSource } from "@/lib/ingest";
import { summarizeItem } from "@/lib/summarizer";
import { verifyItem } from "@/lib/verification";
import { applyDomainLens } from "@/lib/lenses";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function run() {
  const sources = [
    {
      url: "https://export.arxiv.org/api/query?search_query=cat:cs.AI&max_results=2&sortBy=lastUpdatedDate&sortOrder=descending",
      type: "arxiv",
      title: "arXiv CS.AI latest",
      metadata: { countryCode: "GLOBAL", primaryLanguage: "en" },
    },
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

  for (const source of sources) {
    const ensured = await ensureSource(source.url, source.type, source.title, source.metadata);
    const result = await ingestSource(ensured.id);
    logger.info({ source: source.url, result }, "sample-ingest");
    for (const itemId of result.itemIds) {
      await summarizeItem(itemId);
      await verifyItem(itemId);
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      await applyDomainLens(itemId, item?.tags ?? []);
    }
  }

  await prisma.$disconnect();
}

run().catch((error) => {
  logger.error(error, "sample-ingest-failed");
  prisma.$disconnect().finally(() => process.exit(1));
});
