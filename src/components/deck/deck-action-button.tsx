import type { ReactNode } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

import type { SwipeAction } from "@/types/deck";

export const ACTION_COPY: Record<SwipeAction, { label: string; icon: ReactNode }> = {
  left: { label: "Skip", icon: <ArrowLeft className="h-4 w-4" /> },
  right: { label: "Learn", icon: <ArrowRight className="h-4 w-4" /> },
  up: { label: "Save", icon: <ArrowUp className="h-4 w-4" /> },
  down: { label: "Mute", icon: <ArrowDown className="h-4 w-4" /> },
};

export const DECK_ACTIONS: SwipeAction[] = ["left", "right", "up", "down"];

type DeckActionButtonProps = {
  action: SwipeAction;
  onAction: (action: SwipeAction) => void;
  disabled: boolean;
};

export function DeckActionButton({ action, onAction, disabled }: DeckActionButtonProps) {
  const copy = ACTION_COPY[action];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAction(action)}
      aria-label={`${copy.label} card`}
      title={`${copy.label} (press ${
        action === "left"
          ? ""
          : action === "right"
            ? ""
            : action === "up"
              ? ""
              : ""
      })`}
      className={clsx(
        "flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-widest",
        action === "right"
          ? "border-emerald-600/60 text-emerald-300 hover:border-emerald-500"
          : action === "up"
            ? "border-sky-600/60 text-sky-300 hover:border-sky-500"
            : action === "down"
              ? "border-rose-600/50 text-rose-300 hover:border-rose-500"
              : "border-neutral-700 text-neutral-300 hover:border-neutral-500",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {copy.icon}
      {copy.label}
    </button>
  );
}
