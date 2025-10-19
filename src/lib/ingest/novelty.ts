import { prisma } from "@/lib/prisma";

const STOP_WORDS = new Set(
  [
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "could",
    "did",
    "do",
    "does",
    "doing",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "has",
    "have",
    "having",
    "he",
    "her",
    "here",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "itself",
    "just",
    "more",
    "most",
    "my",
    "myself",
    "no",
    "nor",
    "not",
    "now",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "she",
    "should",
    "so",
    "some",
    "such",
    "than",
    "that",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "will",
    "with",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
  ].map((word) => word.toLowerCase()),
);

export function extractKeywords(text: string, limit = 20): string[] {
  const counts = new Map<string, number>();
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  return ranked.slice(0, limit);
}

type NoveltyFingerprint = {
  keywords: string[];
  keywordSet: Set<string>;
};

export type NoveltyContext = {
  fingerprints: NoveltyFingerprint[];
  keywordCounts: Map<string, number>;
  limit: number;
};

export async function buildNoveltyContext(limit = 200): Promise<NoveltyContext> {
  const items = await prisma.item.findMany({
    where: { text: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { text: true },
  });

  const fingerprints: NoveltyFingerprint[] = [];
  const keywordCounts = new Map<string, number>();

  for (const item of items) {
    if (!item.text) continue;
    const keywords = extractKeywords(item.text, 25);
    const keywordSet = new Set(keywords);
    fingerprints.push({ keywords, keywordSet });
    for (const keyword of keywordSet) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
  }

  return { fingerprints, keywordCounts, limit };
}

export function scoreNovelty(
  text: string,
  context: NoveltyContext,
  precomputedKeywords?: string[],
): { score: number; angles: string[]; keywords: string[] } {
  const keywords = precomputedKeywords?.length ? precomputedKeywords : extractKeywords(text, 25);
  if (keywords.length === 0) {
    return { score: 0, angles: [], keywords: [] };
  }

  const keywordSet = new Set(keywords);
  let maxJaccard = 0;

  for (const fingerprint of context.fingerprints) {
    let intersection = 0;
    for (const keyword of fingerprint.keywordSet) {
      if (keywordSet.has(keyword)) {
        intersection += 1;
      }
    }
    if (intersection === 0) continue;
    const unionSize = new Set([...fingerprint.keywords, ...keywords]).size;
    if (unionSize === 0) continue;
    const jaccard = intersection / unionSize;
    if (jaccard > maxJaccard) {
      maxJaccard = jaccard;
    }
  }

  const distinctive = keywords.filter((keyword) => (context.keywordCounts.get(keyword) ?? 0) <= 1).slice(0, 5);
  const angles = distinctive.length > 0 ? distinctive : keywords.slice(0, 5);

  return {
    score: Number((1 - maxJaccard).toFixed(3)),
    angles,
    keywords,
  };
}

export function updateNoveltyContext(context: NoveltyContext, keywords: string[]): void {
  if (keywords.length === 0) return;
  const keywordSet = new Set(keywords);
  context.fingerprints.unshift({ keywords, keywordSet });
  for (const keyword of keywordSet) {
    context.keywordCounts.set(keyword, (context.keywordCounts.get(keyword) ?? 0) + 1);
  }

  if (context.fingerprints.length <= context.limit) {
    return;
  }

  const removed = context.fingerprints.pop();
  if (!removed) return;
  for (const keyword of removed.keywordSet) {
    const next = (context.keywordCounts.get(keyword) ?? 1) - 1;
    if (next <= 0) {
      context.keywordCounts.delete(keyword);
    } else {
      context.keywordCounts.set(keyword, next);
    }
  }
}
