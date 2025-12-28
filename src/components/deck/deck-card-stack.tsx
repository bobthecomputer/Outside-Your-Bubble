import type React from "react";

import { DeckCardContainer, type DeckCardContainerProps } from "./deck-card-container";

type DeckCardStackProps = DeckCardContainerProps & {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function DeckCardStack({ onPointerDown, onPointerUp, ...containerProps }: DeckCardStackProps) {
  return (
    <div className="relative" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <DeckCardContainer {...containerProps} />
    </div>
  );
}
