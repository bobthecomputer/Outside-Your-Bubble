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
    <header className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-glass)] p-6 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Topic deck</h1>
          <p id={instructionsId} className="text-sm text-[color:var(--foreground-muted)]">
            Swipe with your keyboard or fingertips. Left = Skip, Right = Learn, Up = Save, Down = Mute. Press Space to expand bullets. Try Random to shuffle the taxonomy, Study for deeper prompts, or Professional for client-ready briefs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--ink-soft)] text-xs font-semibold uppercase tracking-widest">
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
              let activeClasses = "bg-[color:var(--surface-elevated)] text-[color:var(--paper-bright)]";
              let inactiveClasses = "text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]";
              if (entry.mode === "study") {
                activeClasses = "bg-teal-700/30 text-teal-100";
                inactiveClasses = "text-teal-200/80 hover:text-teal-100";
              } else if (entry.mode === "professional") {
                activeClasses = "bg-amber-700/30 text-amber-100";
                inactiveClasses = "text-amber-300/80 hover:text-amber-200";
              } else if (entry.mode === "random") {
                activeClasses = "bg-cyan-700/30 text-cyan-100";
                inactiveClasses = "text-cyan-300/80 hover:text-cyan-200";
              }
              return (
                <button
                  key={entry.mode}
                  type="button"
                  onClick={() => onSelectMode(entry.mode)}
                  aria-pressed={active}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 transition-colors",
                    index < 2 && "border-r border-[color:var(--border)]",
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
                : "border-[color:var(--border)] text-[color:var(--foreground-muted)] hover:border-amber-400/60 hover:text-amber-200",
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
                ? "border-emerald-500/50 text-emerald-200"
                : "border-[color:var(--border)] text-[color:var(--foreground-muted)] hover:border-emerald-400/60 hover:text-emerald-200",
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
              "border-cyan-600/50 text-cyan-200 hover:border-cyan-400",
              randomLoading && "opacity-70",
            )}
            disabled={randomLoading}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            {randomLoading ? "Picking." : "Random subject"}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--foreground-muted)]">
        <span className="rounded-full border border-[color:var(--border)] px-2 py-1">Median dwell target: 8s+</span>
        <span className="rounded-full border border-[color:var(--border)] px-2 py-1">Keyboard: Left/Right/Up/Down or Space</span>
        <span className="rounded-full border border-[color:var(--border)] px-2 py-1">
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
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)] hover:border-[color:var(--accent-cool)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh deck
        </button>
        {randomSubject && (
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-600/40 bg-cyan-950/30 px-3 py-1 text-cyan-200">
            <Shuffle className="h-3 w-3" aria-hidden="true" />
            {randomSubject.label}
            {Array.isArray(randomSubject.path) && randomSubject.path.length > 0 && (
              <span className="text-cyan-300/80"> / {randomSubject.path.join(" / ")}</span>
            )}
            {randomSubject.tags.length > 0 && (
              <span className="text-cyan-300/80">
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
