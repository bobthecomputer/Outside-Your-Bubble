import { DECK_ACTIONS, DeckActionButton } from "./deck-action-button";
import type { SwipeAction } from "@/types/deck";

type DeckActionBarProps = {
  onAction: (action: SwipeAction) => void;
  disabled: boolean;
};

export function DeckActionBar({ onAction, disabled }: DeckActionBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {DECK_ACTIONS.map((action) => (
        <DeckActionButton key={action} action={action} onAction={onAction} disabled={disabled} />
      ))}
    </div>
  );
}
