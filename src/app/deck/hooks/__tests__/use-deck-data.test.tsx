import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { useDeckData } from "@/app/deck/hooks/use-deck-data";
import type { DeckCard } from "@/types/deck";
import type { ItemTier } from "@prisma/client";

function makeSampleCard(): DeckCard {
  return {
    cardId: "card-1",
    itemId: "item-1",
    headline: "Headline",
    summary: "Summary",
    bullets: [],
    reason: "Reason",
    tier: "BRONZE" as ItemTier,
    rank: 1,
    topic: { id: "t1", slug: "slug", label: "Topic" },
    topicDetails: {
      slug: "slug",
      label: "Topic",
      group: "world",
      tags: [],
      professional: false,
      defaultMode: "quen-3.4b",
    },
    publishedAt: "2025-01-01T00:00:00Z",
    source: { url: "https://example.com", title: "Example", countryCode: null, language: "en" },
    citations: [],
    contextBullets: [],
    studyPrompts: [],
    channels: [],
  };
}

vi.mock("@/app/deck/deck-api", () => {
  const fetchDeckCards = vi.fn().mockResolvedValue([makeSampleCard()]);
  const fetchAchievements = vi
    .fn()
    .mockResolvedValueOnce({ achievements: [] })
    .mockResolvedValue({
      achievements: [{ id: "a1", code: "bubble_popper", earnedAt: "2025-01-01T00:00:00Z" }],
    });
  return { fetchDeckCards, fetchAchievements };
});

describe("useDeckData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("loads deck cards and exposes current card", async () => {
    const { result } = renderHook(() => useDeckData(true));

    await act(async () => {
      await result.current.loadDeck();
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.currentCard?.headline).toBe("Headline");
    expect(result.current.loading).toBe(false);
  });

  it("collects achievement toasts when enabled", async () => {
    const { result } = renderHook(() => useDeckData(true));

    await act(async () => {
      await result.current.refreshAchievements();
    });

    const deckApi = await import("@/app/deck/deck-api");
    expect((deckApi.fetchAchievements as unknown as vi.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
