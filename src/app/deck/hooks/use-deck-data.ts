'use client';

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchAchievements, fetchDeckCards } from "../deck-api";
import type { AchievementToast, DeckCard } from "@/types/deck";

const ACHIEVEMENT_COPY: Record<string, { title: string; description: string }> = {
  bubble_popper: {
    title: "Bubble Popper",
    description: "You swiped outside your usual comfort zone for the first time.",
  },
  wider_view_bronze: {
    title: "Wider-View Bronze",
    description: "You dove into three fresh topics in a single day.",
  },
  mirror_thinker: {
    title: "Mirror Thinker",
    description: "You inspected ten evidence drawers to challenge assumptions.",
  },
};

type LoadDeckOptions = {
  onLoaded?: (cards: DeckCard[]) => void;
};

export function useDeckData(achievementsEnabled: boolean) {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const seenAchievements = useRef(new Set<string>());
  const initialAchievementsLoaded = useRef(false);

  const loadDeck = useCallback(
    async (options: LoadDeckOptions = {}) => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchDeckCards();
        setCards(fetched);
        setCurrentIndex(0);
        options.onLoaded?.(fetched);
        return fetched;
      } catch (deckError) {
        setError(deckError instanceof Error ? deckError.message : "Failed to load deck");
        throw deckError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const refreshAchievements = useCallback(
    async (options: { suppressToasts?: boolean } = {}) => {
      const { suppressToasts = false } = options;
      const data = await fetchAchievements();
      const newToasts: AchievementToast[] = [];
      for (const achievement of data.achievements) {
        if (seenAchievements.current.has(achievement.id)) continue;
        seenAchievements.current.add(achievement.id);
        if (!achievementsEnabled || suppressToasts) continue;
        const copy = ACHIEVEMENT_COPY[achievement.code];
        if (copy) {
          newToasts.push({ id: achievement.id, title: copy.title, description: copy.description });
        }
      }
      if (newToasts.length > 0) {
        setAchievementToasts((prev) => [...prev, ...newToasts]);
      }
    },
    [achievementsEnabled],
  );

  useEffect(() => {
    if (initialAchievementsLoaded.current) return;
    initialAchievementsLoaded.current = true;
    refreshAchievements({ suppressToasts: true }).catch(() => undefined);
  }, [refreshAchievements]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAchievementToasts((prev) => prev.slice(1));
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  const dismissAchievementToast = useCallback((id: string) => {
    setAchievementToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const currentCard = cards[currentIndex] ?? null;

  return {
    achievementToasts,
    cards,
    currentCard,
    currentIndex,
    dismissAchievementToast,
    error,
    loadDeck,
    loading,
    refreshAchievements,
    setCurrentIndex,
  };
}
