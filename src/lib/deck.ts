import { randomUUID } from "crypto";
import type { DeckCard as DeckCardModel, Item, Source, Summary, Topic } from "@prisma/client";
import type { DeckCardView, SwipeAction } from "@/types/deck";
import { prisma } from "./prisma";
import { normalizeSummaryCitations } from "./citations";
import { logger } from "./logger";
import { awardAchievement } from "./achievements";
import { recordEvent } from "./events";

export type { DeckCardReason, DeckCardView, SwipeAction } from "@/types/deck";

const DEFAULT_DECK_LIMIT = 12;
const MAX_PER_TOPIC = 3;
const DECK_LOOKBACK_HOURS = 24;

async function loadRecentItemIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const since = new Date(Date.now() - DECK_LOOKBACK_HOURS * 60 * 60 * 1000);
  const events = await prisma.event.findMany({
    where: {
      userId,
      name: { in: ["deck.swipe", "deck.view"] },
      ts: { gte: since },
    },
    select: { payload: true },
  });

  const recent = new Set<string>();
  for (const event of events) {
    const payload = event.payload as { itemId?: unknown } | null;
    const itemId = payload?.itemId;
    if (typeof itemId === "string") {
      recent.add(itemId);
    }
  }
  return recent;
}

type DeckCardWithRelations = DeckCardModel & {
  item: Item & {
    summary: Summary | null;
    source: Source;
    topic: Topic | null;
  };
  topic: Topic | null;
};

function toDeckView(card: DeckCardWithRelations): DeckCardView | null {
  const { item } = card;
  const summary = item.summary;
  if (!summary) return null;
  const bullets = (summary.bullets ?? []).filter((entry): entry is string => typeof entry === "string");
  const headline = summary.headline ?? item.title ?? item.url;
  const summaryText = item.summaryText ?? bullets[0] ?? headline;
  const contextBullets = Array.isArray(item.contextBullets)
    ? item.contextBullets.filter((entry): entry is string => typeof entry === "string").slice(0, 4)
    : [];
  const studyPrompts = Array.isArray(item.studyPrompts)
    ? item.studyPrompts.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
    : [];
  const channels = Array.isArray(item.channels)
    ? item.channels.filter((entry): entry is string => typeof entry === "string")
    : [];

  const regionTag = Array.isArray(item.tags)
    ? item.tags.find((tag): tag is string => typeof tag === "string" && tag.startsWith("region:")) ?? null
    : null;

  const topic = card.topic ?? item.topic;

  return {
    cardId: card.id,
    itemId: item.id,
    headline,
    summary: summaryText,
    bullets: bullets.slice(0, 4),
    reason: card.reason ?? "High-signal pick",
    tier: item.tier,
    rank: card.rank ?? 0,
    topic: topic
      ? {
          id: topic.id,
          slug: topic.slug,
          label: topic.label,
        }
      : null,
    topicDetails: topic
      ? {
          slug: topic.slug,
          label: topic.label,
          group: topic.group ?? "general",
          subcategory: topic.subcategory,
          tags: Array.isArray(topic.tags) ? topic.tags : [],
          professional: Boolean(topic.professional),
          defaultMode: topic.defaultMode ?? "quen-3.4b",
        }
      : null,
    publishedAt: item.publishedAt?.toISOString(),
    source: {
      title: item.source.title,
      url: item.url,
      countryCode: item.source.countryCode,
      language: item.source.primaryLanguage ?? item.lang ?? null,
    },
    citations: normalizeSummaryCitations(summary.citations).slice(0, 3),
    regionTag,
    excerpt: item.excerpt,
    contextSummary: item.contextSummary,
    contextBullets,
    studyPrompts,
    channels,
    translationProvider: item.translationProvider ?? null,
    language: item.lang ?? null,
    contextMetadata: (item.contextMetadata as Record<string, unknown> | null) ?? null,
  };
}

async function fallbackItems(excludeItemIds: string[], limit: number): Promise<DeckCardView[]> {
  if (limit <= 0) return [];
  const items = await prisma.item.findMany({
    where: {
      id: { notIn: excludeItemIds },
      summary: { isNot: null },
    },
    include: {
      summary: true,
      source: true,
      topic: true,
    },
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: limit * 2,
  });

  const views: DeckCardView[] = [];
  for (const item of items) {
    if (!item.summary) continue;
    const bullets = (item.summary.bullets ?? []).filter((entry): entry is string => typeof entry === "string");
    if (bullets.length === 0) continue;
    const regionTag = Array.isArray(item.tags)
      ? item.tags.find((tag): tag is string => typeof tag === "string" && tag.startsWith("region:")) ?? null
      : null;

    const topic = item.topic;

    views.push({
      cardId: randomUUID(),
      itemId: item.id,
      headline: item.summary.headline ?? item.title ?? item.url,
      summary: item.summaryText ?? bullets[0],
      bullets: bullets.slice(0, 4),
      reason: "Fresh intelligence",
      tier: item.tier,
      rank: 0,
      topic: topic
        ? { id: topic.id, slug: topic.slug, label: topic.label }
        : null,
      topicDetails: topic
        ? {
            slug: topic.slug,
            label: topic.label,
            group: topic.group ?? "general",
            subcategory: topic.subcategory,
            tags: Array.isArray(topic.tags) ? topic.tags : [],
            professional: Boolean(topic.professional),
            defaultMode: topic.defaultMode ?? "quen-3.4b",
          }
        : null,
      publishedAt: item.publishedAt?.toISOString(),
    source: {
      title: item.source.title,
      url: item.url,
      countryCode: item.source.countryCode,
      language: item.source.primaryLanguage ?? item.lang ?? null,
    },
    citations: normalizeSummaryCitations(item.summary.citations).slice(0, 3),
    regionTag,
    excerpt: item.excerpt,
    contextSummary: item.contextSummary,
    contextBullets: Array.isArray(item.contextBullets)
      ? item.contextBullets.filter((entry): entry is string => typeof entry === "string").slice(0, 4)
      : [],
    studyPrompts: Array.isArray(item.studyPrompts)
      ? item.studyPrompts.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
      : [],
    channels: Array.isArray(item.channels)
      ? item.channels.filter((entry): entry is string => typeof entry === "string")
      : [],
    translationProvider: item.translationProvider ?? null,
    language: item.lang ?? null,
    contextMetadata: (item.contextMetadata as Record<string, unknown> | null) ?? null,
  });
    if (views.length >= limit) break;
  }

  return views;
}

export async function buildDeck(options: { userId?: string; limit?: number; ip?: string | null } = {}): Promise<DeckCardView[]> {
  const { userId, limit = DEFAULT_DECK_LIMIT, ip } = options;
  const recentItemIds = await loadRecentItemIds(userId);

  const candidates = await prisma.deckCard.findMany({
    where: {
      item: {
        summary: { isNot: null },
      },
    },
    include: {
      item: {
        include: {
          summary: true,
          source: true,
          topic: true,
        },
      },
      topic: true,
    },
    orderBy: [
      { rank: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit * 4,
  });

  const deduped: DeckCardView[] = [];
  const topicCounts = new Map<string, number>();
  const seenItems = new Set<string>();

  for (const card of candidates) {
    if (recentItemIds.has(card.itemId)) continue;
    if (seenItems.has(card.itemId)) continue;
    const view = toDeckView(card);
    if (!view) continue;

    const topicKey = view.topic?.slug ?? "_none";
    const currentCount = topicCounts.get(topicKey) ?? 0;
    if (currentCount >= MAX_PER_TOPIC) continue;

    deduped.push(view);
    seenItems.add(card.itemId);
    topicCounts.set(topicKey, currentCount + 1);

    if (deduped.length >= limit) break;
  }

  if (deduped.length < limit) {
    const fallback = await fallbackItems(
      [...Array.from(seenItems), ...Array.from(recentItemIds)],
      limit - deduped.length,
    );
    for (const card of fallback) {
      const topicKey = card.topic?.slug ?? "_none";
      const currentCount = topicCounts.get(topicKey) ?? 0;
      if (currentCount >= MAX_PER_TOPIC) continue;
      deduped.push(card);
      topicCounts.set(topicKey, currentCount + 1);
      if (deduped.length >= limit) break;
    }
  }

  if (userId) {
    try {
      await recordEvent({
        userId,
        name: "deck.view",
        payload: {
          itemIds: deduped.map((card) => card.itemId),
        },
        metadata: { ip },
      });
    } catch (error) {
      logger.warn({ error }, "Failed to log deck view event");
    }
  }

  return deduped;
}

function actionDelta(action: SwipeAction): number {
  switch (action) {
    case "right":
      return 1;
    case "up":
      return 0.5;
    case "down":
      return -0.25;
    case "left":
    default:
      return -0.5;
  }
}

async function maybeAwardSwipeAchievements(
  userId: string,
  action: SwipeAction,
  card: DeckCardWithRelations,
) {
  if (!userId) return;
  if (action === "right") {
    await awardAchievement(userId, "bubble_popper");
  }

  if (action === "right" || action === "up") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: {
        userId,
        name: "deck.swipe",
        ts: { gte: since },
      },
      select: { payload: true },
    });

    const topics = new Set<string>();
    for (const event of events) {
      const payload = event.payload as { topicSlug?: unknown; action?: unknown } | null;
      if (payload?.action !== "right" && payload?.action !== "up") continue;
      if (typeof payload?.topicSlug === "string") {
        topics.add(payload.topicSlug);
      }
    }

    const topicSlug = card.topic?.slug ?? card.item.topic?.slug;
    if (topicSlug) {
      topics.add(topicSlug);
    }

    if (topics.size >= 3) {
      await awardAchievement(userId, "wider_view_bronze", {
        topics: Array.from(topics),
        windowHours: 24,
      });
    }
  }
}

export async function recordSwipe(options: {
  userId?: string;
  cardId: string;
  action: SwipeAction;
  durationMs?: number | null;
  ip?: string | null;
}): Promise<void> {
  const { userId, cardId, action, durationMs, ip } = options;

  const card = await prisma.deckCard.findUnique({
    where: { id: cardId },
    include: {
      item: {
        include: {
          summary: true,
          source: true,
          topic: true,
        },
      },
      topic: true,
    },
  });

  if (!card) {
    throw new Error("Deck card not found");
  }

  if (userId) {
    try {
      await recordEvent({
        userId,
        name: "deck.swipe",
        payload: {
          cardId,
          itemId: card.itemId,
          topicId: card.topic?.id ?? card.item.topic?.id ?? null,
          topicSlug: card.topic?.slug ?? card.item.topic?.slug,
          action,
          durationMs: durationMs ?? undefined,
        },
        metadata: { ip },
      });
    } catch (eventError) {
      logger.warn({ eventError }, "Failed to log swipe event");
    }
  }

  const delta = actionDelta(action);
  try {
    await prisma.deckCard.update({
      where: { id: cardId },
      data: {
        rank: (card.rank ?? 0) + delta,
      },
    });
  } catch (error) {
    logger.warn({ error }, "Failed to update deck card rank");
  }

  if (userId) {
    try {
      await maybeAwardSwipeAchievements(userId, action, card);
    } catch (error) {
      logger.warn({ error }, "Failed to evaluate swipe achievements");
    }
  }
}
