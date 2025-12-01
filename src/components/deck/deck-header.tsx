'use client';

import clsx from "clsx";
import {
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  Contrast,
  Info,
  RefreshCw,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import type { DeckMode, RandomSubject } from "@/types/deck";

type DeckHeaderProps = {
  achievementsEnabled: boolean;
  deckMode: DeckMode;
  highContrast: boolean;
  instructionsId: string;
  onRandomSubject: () => void;
  onRefreshDeck: () => void;
  onSelectMode: (mode: DeckMode) => void;
  onToggleAchievements: () => void;
  onToggleContrast: () => void;
  randomError: string | null;
  randomLoading: boolean;
  randomSubject: RandomSubject | null;
};

export function DeckHeader({
  achievementsEnabled,
  deckMode,
  highContrast,
  instructionsId,
  onRandomSubject,
  onRefreshDeck,
  onSelectMode,
  onToggleAchievements,
  onToggleContrast,
  randomError,
  randomLoading,
  randomSubject,
}: DeckHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-neutral-900 bg-neutral-950/80 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Topic deck</h1>
          <p id={instructionsId} className="text-sm text-neutral-400">
            Swipe with your keyboard or fingertips. Left = Skip, Right = Learn, Up = Save, Down = Mute. Press Space to expand bullets. Try Random to shuffle the taxonomy, Study for deeper prompts, or Professional for client-ready briefs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-neutral-800 bg-neutral-900/60 text-xs font-semibold uppercase tracking-widest">
            {(
              [
                { mode: "discover" as DeckMode, label: "Discover", icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> },
                { mode: "random" as DeckMode, label: "Random", icon: <Shuffle className="h-3.5 w-3.5" aria-hidden="true" /> },
                { mode: "study" as DeckMode, label: "Study", icon: <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" /> },
                {
                  mode: "professional" as DeckMode,
                  label: "Professional",
                  icon: <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />,
                },
              ] as Array<{ mode: DeckMode; label: string; icon: ReactNode }>
            ).map((entry, index) => {
              const active = deckMode === entry.mode;
              let activeClasses = "bg-neutral-800 text-neutral-100";
              let inactiveClasses = "text-neutral-400 hover:text-neutral-100";
              if (entry.mode === "study") {
                activeClasses = "bg-purple-700/30 text-purple-100";
                inactiveClasses = "text-purple-300/80 hover:text-purple-200";
              } else if (entry.mode === "professional") {
                activeClasses = "bg-amber-700/30 text-amber-100";
                inactiveClasses = "text-amber-300/80 hover:text-amber-200";
              } else if (entry.mode === "random") {
                activeClasses = "bg-sky-700/30 text-sky-100";
                inactiveClasses = "text-sky-300/80 hover:text-sky-200";
              }
              return (
                <button
                  key={entry.mode}
                  type="button"
                  onClick={() => onSelectMode(entry.mode)}
                  aria-pressed={active}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 transition-colors",
                    index < 2 && "border-r border-neutral-800/70",
                    active ? activeClasses : inactiveClasses,
                  )}
                >
                  {entry.icon}
                  {entry.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onToggleContrast}
            aria-pressed={highContrast}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
              highContrast
                ? "border-amber-400/60 text-amber-200"
                : "border-neutral-700 text-neutral-400 hover:border-amber-400/40 hover:text-amber-200",
            )}
          >
            <Contrast className="h-4 w-4" aria-hidden="true" />
            {highContrast ? "High contrast" : "High contrast off"}
          </button>
          <button
            type="button"
            onClick={onToggleAchievements}
            aria-pressed={achievementsEnabled}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
              achievementsEnabled
                ? "border-emerald-500/50 text-emerald-300"
                : "border-neutral-700 text-neutral-400 hover:border-emerald-500/40 hover:text-emerald-200",
            )}
          >
            <Award className="h-4 w-4" aria-hidden="true" />
            {achievementsEnabled ? "Toasts on" : "Toasts muted"}
          </button>
          <button
            type="button"
            onClick={onRandomSubject}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
              "border-sky-600/50 text-sky-200 hover:border-sky-500",
              randomLoading && "opacity-70",
            )}
            disabled={randomLoading}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            {randomLoading ? "Picking." : "Random subject"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
        <span className="rounded-full border border-neutral-800 px-2 py-1">Median dwell target: 8s+</span>
        <span className="rounded-full border border-neutral-800 px-2 py-1">Keyboard: Left/Right/Up/Down or Space</span>
        <span className="rounded-full border border-neutral-800 px-2 py-1">
          {deckMode === "random"
            ? "Random mode jumps to unexpected subjects"
            : deckMode === "study"
              ? "Study mode reveals context helpers"
              : deckMode === "professional"
                ? "Professional mode crafts briefs"
                : "Discover keeps things lightweight"}
        </span>
        <button
          type="button"
          onClick={onRefreshDeck}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-600"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh deck
        </button>
        {randomSubject && (
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-600/40 bg-sky-950/30 px-3 py-1 text-sky-200">
            <Shuffle className="h-3 w-3" aria-hidden="true" />
            {randomSubject.label}
            {Array.isArray(randomSubject.path) && randomSubject.path.length > 0 && (
          <span className="text-sky-300/80"> / {randomSubject.path.join(" / ")}</span>
        )}
        {randomSubject.tags.length > 0 && (
          <span className="text-sky-300/80">
            - {randomSubject.tags.slice(0, 2).join(", ")}
            {randomSubject.tags.length > 2 ? "..." : ""}
          </span>
        )}
      </span>
    )}
        {randomError && (
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-600/40 bg-rose-950/30 px-3 py-1 text-rose-200">
            <Info className="h-3 w-3" aria-hidden="true" /> {randomError}
          </span>
        )}
      </div>
    </header>
  );
}
