import { DeckActionBar } from "./deck-action-bar";
import type { SwipeAction } from "@/types/deck";

type DeckControlsShellProps = {
  onAction: (action: SwipeAction) => void;
  disabled: boolean;
};

export function DeckControlsShell({ onAction, disabled }: DeckControlsShellProps) {
  return (
    <div className="mt-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-4">
      <DeckActionBar onAction={onAction} disabled={disabled} />
    </div>
  );
}
