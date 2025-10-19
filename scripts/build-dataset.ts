import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { readingTimeMinutes } from "@/lib/ingest/utils";
import { normalizeSummaryCitations } from "@/lib/citations";

function filterStrings(values: unknown[]): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

async function main() {
  const outputDir = path.join(process.cwd(), "data", "datasets");
  await fs.promises.mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const datasetPath = path.join(outputDir, `oyb-dataset-${timestamp}.jsonl`);
  const metaPath = path.join(outputDir, `oyb-dataset-${timestamp}.meta.json`);

  const items = await prisma.item.findMany({
    where: {
      text: { not: null },
      summary: { isNot: null },
    },
    include: {
      summary: true,
      verification: true,
      source: true,
      topic: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  if (items.length === 0) {
    console.log("No summarized items available; skipping dataset generation.");
    await prisma.$disconnect();
    return;
  }

  const writeStream = fs.createWriteStream(datasetPath, { encoding: "utf-8" });
  let count = 0;

  for (const item of items) {
    if (!item.summary || !item.text) continue;
    const bullets = filterStrings(item.summary.bullets ?? []);
    const citations = normalizeSummaryCitations(item.summary.citations);
    const contextMetadata = (item.contextMetadata ?? {}) as Record<string, unknown>;
    const rawAlternateFeeds = contextMetadata["alternateFeeds"];
    const alternateFeeds = Array.isArray(rawAlternateFeeds)
      ? rawAlternateFeeds
          .map((feed) => (typeof feed === "string" ? feed : null))
          .filter((feed): feed is string => Boolean(feed))
      : [];
    const rawOEmbed = contextMetadata["oEmbed"];
    const oEmbed =
      rawOEmbed && typeof rawOEmbed === "object"
        ? {
            provider: typeof (rawOEmbed as { provider?: unknown }).provider === "string" ? (rawOEmbed as { provider?: string }).provider : null,
            title: typeof (rawOEmbed as { title?: unknown }).title === "string" ? (rawOEmbed as { title?: string }).title : null,
            author: typeof (rawOEmbed as { author?: unknown }).author === "string" ? (rawOEmbed as { author?: string }).author : null,
            url: typeof (rawOEmbed as { url?: unknown }).url === "string" ? (rawOEmbed as { url?: string }).url : null,
          }
        : null;

    const topic = item.topic
      ? {
          slug: item.topic.slug,
          label: item.topic.label,
          group: item.topic.group ?? "general",
          subcategory: item.topic.subcategory ?? null,
          tags: item.topic.tags ?? [],
          professional: item.topic.professional ?? false,
          defaultMode: item.topic.defaultMode ?? "quen-3.4b",
        }
      : null;

    const record = {
      id: item.id,
      url: item.url,
      title: item.summary.headline ?? item.title ?? item.url,
      summary: item.summaryText ?? bullets.join(" "),
      bullets,
      text: item.text,
      originalText: item.originalText ?? null,
      language: item.lang ?? null,
      translationProvider: item.translationProvider ?? null,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      tags: item.tags,
      tier: item.tier,
      noveltyScore: item.noveltyScore ?? null,
      noveltyAngles: item.noveltyAngles ?? [],
      excerpt: item.excerpt ?? null,
      contextSummary: item.contextSummary ?? null,
      contextBullets: item.contextBullets ?? [],
      studyPrompts: item.studyPrompts ?? [],
      channels: item.channels ?? [],
      contextMetadata: item.contextMetadata ?? null,
      alternateFeeds,
      oEmbed,
      citations,
      claims: item.summary.claims,
      contradictions: item.verification?.contradictions ?? [],
      verificationStatus: item.verification?.status ?? item.status,
      verificationEvidence: item.verification?.evidence ?? [],
      source: {
        id: item.source.id,
        title: item.source.title,
        type: item.source.type,
        url: item.source.url,
        countryCode: item.source.countryCode,
        primaryLanguage: item.source.primaryLanguage,
      },
      readingMinutes: readingTimeMinutes(item.originalText ?? item.text),
      topic,
    };

    writeStream.write(`${JSON.stringify(record)}\n`);
    count += 1;
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.on("error", reject);
    writeStream.end(() => resolve());
  });

  const meta = {
    generatedAt: new Date().toISOString(),
    itemCount: count,
    output: path.relative(process.cwd(), datasetPath),
    fields: [
      "id",
      "url",
      "title",
      "summary",
      "bullets",
      "text",
      "originalText",
      "language",
      "translationProvider",
      "publishedAt",
      "tags",
      "tier",
      "noveltyScore",
      "noveltyAngles",
      "excerpt",
      "contextSummary",
      "contextBullets",
      "studyPrompts",
      "channels",
      "contextMetadata",
      "alternateFeeds",
      "oEmbed",
      "citations",
      "claims",
      "contradictions",
      "verificationStatus",
      "verificationEvidence",
      "source",
      "readingMinutes",
      "topic",
    ],
  };

  await fs.promises.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");

  console.log(`Dataset written to ${path.relative(process.cwd(), datasetPath)} (${count} items).`);
  console.log(`Metadata written to ${path.relative(process.cwd(), metaPath)}.`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("dataset:build failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
