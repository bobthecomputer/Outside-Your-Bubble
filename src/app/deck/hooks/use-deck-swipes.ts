'use client';

import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { SwipeAction } from "@/types/deck";

type DeckSwipesOptions = {
  enabled?: boolean;
  minDistance?: number;
  onAction: (action: SwipeAction) => void;
  onSpace?: () => void;
};

export function useDeckSwipes({ enabled = true, minDistance = 60, onAction, onSpace }: DeckSwipesOptions) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      pointerStart.current = { x: event.clientX, y: event.clientY };
    },
    [enabled],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || !pointerStart.current) return;
      const dx = event.clientX - pointerStart.current.x;
      const dy = event.clientY - pointerStart.current.y;
      pointerStart.current = null;
      if (Math.abs(dx) < minDistance && Math.abs(dy) < minDistance) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        onAction(dx > 0 ? "right" : "left");
      } else {
        onAction(dy < 0 ? "up" : "down");
      }
    },
    [enabled, minDistance, onAction],
  );

  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
      }
      switch (event.key) {
        case "ArrowLeft":
          onAction("left");
          break;
        case "ArrowRight":
          onAction("right");
          break;
        case "ArrowUp":
          onAction("up");
          break;
        case "ArrowDown":
          onAction("down");
          break;
        case " ":
          onSpace?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAction, onSpace]);

  return { handlePointerDown, handlePointerUp };
}
