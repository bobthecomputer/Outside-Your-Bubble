'use client';

import clsx from "clsx";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BookOpenCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Info,
  Languages,
  Loader2,
  Palette,
  Radio,
  Sparkles,
  Timer,
  BriefcaseBusiness,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { DeckActionButton, DECK_ACTIONS } from "@/components/deck";
import type {
  DeckCard,
  DeckMode,
  ProfessionalBriefResult,
  StudySuggestionResult,
  SwipeAction,
} from "@/types/deck";

type ContextChip = { id: string; label: string; description: string; icon: ReactNode };

type CardAnimation = {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit: Record<string, unknown>;
  transition: Record<string, unknown>;
};

type DeckCardPanelProps = {
  card: DeckCard;
  contextChips: ContextChip[];
  deckMode: DeckMode;
  expanded: boolean;
  onToggleExpand: () => void;
  cardAnimation: CardAnimation;
  publishedAtText?: string | null;
  bulletVariants?: Variants;
  prefersReducedMotion: boolean;
  instructionsId: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpenEvidence: () => void;
  onShareOpen: () => void;
  shareEnabled: boolean;
  onAction: (action: SwipeAction) => void;
  cardRef?: (node: HTMLElement | null) => void;
  focusTargetSeconds: number;
  focusDashOffset: number;
  dwellSeconds: number;
  dwellProgress: number;
  noteFieldId: string;
  noteHintId: string;
  noteValue: string;
  onNoteChange: (value: string) => void;
  studyTopic: string;
  setStudyTopic: Dispatch<SetStateAction<string>>;
  studyModel: string;
  setStudyModel: Dispatch<SetStateAction<string>>;
  studySuggestion: StudySuggestionResult | null;
  studyLoading: boolean;
  studyError: string | null;
  onStudySuggestion: () => void;
  professionalPersona: "strategist" | "designer" | "investor";
  setProfessionalPersona: Dispatch<SetStateAction<"strategist" | "designer" | "investor">>;
  professionalModel: string;
  setProfessionalModel: Dispatch<SetStateAction<string>>;
  professionalBrief: ProfessionalBriefResult | null;
  professionalLoading: boolean;
  professionalError: string | null;
  onProfessionalBrief: () => void;
};

export function DeckCardPanel({
  card,
  contextChips,
  deckMode,
  expanded,
  onToggleExpand,
  cardAnimation,
  publishedAtText,
  bulletVariants,
  prefersReducedMotion,
  instructionsId,
  onPointerDown,
  onPointerUp,
  onOpenEvidence,
  onShareOpen,
  shareEnabled,
  onAction,
  cardRef,
  focusTargetSeconds,
  focusDashOffset,
  dwellSeconds,
  dwellProgress,
  noteFieldId,
  noteHintId,
  noteValue,
  onNoteChange,
  studyTopic,
  setStudyTopic,
  studyModel,
  setStudyModel,
  studySuggestion,
  studyLoading,
  studyError,
  onStudySuggestion,
  professionalPersona,
  setProfessionalPersona,
  professionalModel,
  setProfessionalModel,
  professionalBrief,
  professionalLoading,
  professionalError,
  onProfessionalBrief,
}: DeckCardPanelProps) {
  return (
    <motion.article
      key={card.cardId}
      initial={cardAnimation.initial}
      animate={cardAnimation.animate}
      exit={cardAnimation.exit}
      transition={cardAnimation.transition}
      className="relative min-h-[420px] touch-pan-y select-none overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-950/80 p-6 shadow-xl"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      id="deck-panel"
      tabIndex={-1}
      role="group"
      aria-describedby={instructionsId}
      aria-label={`Topic card: ${card.headline}`}
      ref={cardRef}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400">
            {card.topic?.label ?? "Outside pick"}
          </div>
          <h2 className="text-2xl font-semibold text-neutral-50">{card.headline}</h2>
          <p className="text-sm text-neutral-400">{card.reason}</p>
          {publishedAtText && (
            <p className="text-xs text-neutral-500">{publishedAtText}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 text-right">
          <span className="rounded-full border border-emerald-600/40 px-3 py-1 text-xs text-emerald-300">
            Tier {card.tier}
          </span>
          <Link
            href={card.source.url}
            target="_blank"
            aria-label="Open original source"
            className="inline-flex items-center gap-2 rounded-full border border-sky-600/40 px-3 py-1 text-xs text-sky-300 hover:border-sky-500"
          >
            <Info className="h-4 w-4" aria-hidden="true" /> Visit source
          </Link>
          <button
            type="button"
            onClick={onOpenEvidence}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-600"
            aria-label="Open evidence drawer"
          >
            <Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> Open evidence
          </button>
          {shareEnabled && (
            <button
              type="button"
              onClick={onShareOpen}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 px-3 py-1 text-xs text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Pitch story to partners"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Pitch to partners
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-base text-neutral-200">{card.summary}</p>
        <div className={clsx("overflow-hidden transition-all", expanded ? "max-h-[320px]" : "max-h-24")}>
          <motion.ul
            className="space-y-3 text-sm text-neutral-300"
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "visible"}
            variants={
              prefersReducedMotion
                ? undefined
                : { visible: { transition: { staggerChildren: 0.05 } } }
            }
          >
            {card.bullets.map((bullet) => (
              <motion.li key={bullet} className="flex gap-3" variants={bulletVariants}>
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600" aria-hidden="true" />
                <span>{bullet}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200"
        >
          {expanded ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}{" "}
          {expanded ? "Collapse" : "Expand"}
        </button>
        {card.excerpt && (
          <blockquote className="border-l-2 border-neutral-800/70 pl-4 text-sm italic text-neutral-400">
            "{card.excerpt}"
          </blockquote>
        )}
      </div>

      <AnimatePresence initial={false}>
        {deckMode === "study" && (
          <motion.section
            key="study-panel"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: prefersReducedMotion ? 0.18 : 0.25, ease: "easeOut" }}
            className="mt-6 rounded-2xl border border-purple-700/40 bg-purple-950/30 p-4 text-sm text-purple-100"
            aria-label="Study helpers"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-300">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" /> Study helpers
            </div>
            {card.contextSummary ? (
              <p className="mt-3 text-sm text-purple-100">{card.contextSummary}</p>
            ) : (
              <p className="mt-3 text-xs text-purple-200/80">Contextual summary loading-check the evidence drawer for deeper detail.</p>
            )}
            {contextChips.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contextChips.map((chip) => (
                  <div
                    key={chip.id}
                    className="rounded-xl border border-purple-800/40 bg-neutral-950/30 p-3"
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                      {chip.icon}
                      <span>{chip.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-purple-200/80">{chip.description}</p>
                  </div>
                ))}
              </div>
            )}
            {card.contextBullets.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-purple-100/90">
                {card.contextBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-purple-800/30 bg-neutral-950/40 p-3">
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 52 52"
                  className="h-12 w-12"
                  role="img"
                  aria-label={`Focus progress ${Math.round(dwellProgress * 100)} percent`}
                >
                  <circle cx="26" cy="26" r="20" className="fill-none stroke-neutral-800" strokeWidth="3" />
                  <motion.circle
                    cx="26"
                    cy="26"
                    r="20"
                    className="fill-none stroke-purple-400"
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={focusDashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 26 26)"
                  />
                </svg>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-300">
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Focus time
                  </div>
                  <p className="text-sm text-purple-100">
                    {dwellSeconds}s / {focusTargetSeconds}s target
                  </p>
                </div>
              </div>
              <p className="text-xs text-purple-200/80">Stay with this card to unlock richer prompts and path recommendations.</p>
            </div>
            {card.studyPrompts.length > 0 && (
              <div className="mt-4 rounded-xl border border-purple-700/30 bg-neutral-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Reflection prompts</p>
                <ul className="mt-2 space-y-2 text-sm text-purple-100/90">
                  {card.studyPrompts.map((prompt) => (
                    <li key={prompt} className="flex gap-2">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 text-purple-300" aria-hidden="true" />
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {card.channels.length > 0 && (
              <div className="mt-4 rounded-xl border border-purple-700/30 bg-neutral-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Signal channels</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-purple-200/80">
                  {card.channels.map((channel) => (
                    <span key={channel} className="inline-flex items-center gap-1 rounded-full border border-purple-600/40 bg-purple-950/40 px-3 py-1">
                      <Radio className="h-3 w-3" aria-hidden="true" /> {channel}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <form
              className="mt-4 grid gap-3 rounded-xl border border-purple-800/40 bg-neutral-950/40 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                onStudySuggestion();
              }}
            >
              <label className="text-xs font-semibold uppercase tracking-widest text-purple-300">
                What are you studying?
                <input
                  type="text"
                  value={studyTopic}
                  onChange={(event) => setStudyTopic(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-purple-700/40 bg-neutral-950/60 px-3 py-2 text-sm text-purple-100 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                  placeholder="e.g. Climate finance, constitutional reform"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-widest text-purple-300">
                Thinking model
                <select
                  value={studyModel}
                  onChange={(event) => setStudyModel(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-purple-700/40 bg-neutral-950/60 px-3 py-2 text-sm text-purple-100 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="quen-3.4b">Qwen 3.4b</option>
                  <option value="quen-3.4b-thinking">Qwen 3.4b - Thinking</option>
                  <option value="quen-2.5">Qwen 2.5</option>
                  <option value="quen-2.5-thinking">Qwen 2.5 - Thinking</option>
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-purple-100 hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={studyLoading}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {studyLoading ? "Synthesising." : "Generate prompts"}
                </button>
                {studyError && <span className="text-xs text-rose-200">{studyError}</span>}
              </div>
              {studySuggestion && (
                <div className="grid gap-3 rounded-xl border border-purple-700/40 bg-neutral-950/30 p-3 text-sm text-purple-100/90">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">Spotlight subject</p>
                  <p>{studySuggestion.spotlightSubject}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">Presentation question</p>
                  <p>{studySuggestion.presentationQuestion}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">Questions to explore</p>
                  <ul className="space-y-2">
                    {studySuggestion.questions.map((question) => (
                      <li key={question} className="flex gap-2">
                        <Sparkles className="mt-0.5 h-3 w-3 text-purple-300" aria-hidden="true" />
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">Presentation prompt</p>
                  <p>{studySuggestion.presentationPrompt}</p>
                  {studySuggestion.impactHints.length > 0 && (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">Impact hints</p>
                      <ul className="space-y-1 text-sm">
                        {studySuggestion.impactHints.map((hint) => (
                          <li key={hint} className="flex gap-2">
                            <Radio className="mt-0.5 h-3 w-3 text-purple-300" aria-hidden="true" />
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="text-[10px] text-purple-300/70">Method: {studySuggestion.method}</p>
                </div>
              )}
            </form>

            <div className="mt-4 rounded-xl border border-purple-800/40 bg-neutral-950/40 p-3">
              <label className="text-xs font-semibold uppercase tracking-widest text-purple-300">
                Notes
                <textarea
                  id={noteFieldId}
                  aria-describedby={noteHintId}
                  value={noteValue}
                  onChange={(event) => onNoteChange(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-purple-700/40 bg-neutral-950/60 p-3 text-sm text-purple-100 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Capture takeaways or cross-links."
                />
              </label>
              <p id={noteHintId} className="mt-1 text-xs text-purple-200/80">
                Notes stay on this device.
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {deckMode === "professional" && (
          <motion.section
            key="professional-panel"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: prefersReducedMotion ? 0.18 : 0.25, ease: "easeOut" }}
            className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-100"
            aria-label="Professional helpers"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> Professional brief
            </div>
            <div className="mt-4 grid gap-3 rounded-xl border border-amber-700/30 bg-amber-950/20 p-3">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                Persona
                <select
                  value={professionalPersona}
                  onChange={(event) =>
                    setProfessionalPersona(event.target.value as "strategist" | "designer" | "investor")
                  }
                  className="mt-1 w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="strategist">Strategist</option>
                  <option value="designer">Designer</option>
                  <option value="investor">Investor</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">
                Thinking model
                <select
                  value={professionalModel}
                  onChange={(event) => setProfessionalModel(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="quen-3.4b">Qwen 3.4b</option>
                  <option value="quen-3.4b-thinking">Qwen 3.4b - Thinking</option>
                  <option value="quen-2.5">Qwen 2.5</option>
                  <option value="quen-2.5-thinking">Qwen 2.5 - Thinking</option>
                </select>
              </label>
              <button
                type="button"
                onClick={onProfessionalBrief}
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-100 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={professionalLoading}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {professionalLoading ? "Drafting." : "Generate brief"}
              </button>
              {professionalError && <span className="text-xs text-rose-200">{professionalError}</span>}
            </div>
            {professionalBrief && (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0.8 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1 }}
                className="mt-4 grid gap-3 rounded-xl border border-amber-700/30 bg-amber-950/20 p-3 text-sm text-amber-100/90"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Topic</p>
                <p>{professionalBrief.topic}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Key points</p>
                <ul className="space-y-2">
                  {professionalBrief.keyPoints.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Sparkles className="mt-0.5 h-3 w-3 text-amber-300" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                {professionalBrief.pitchOutline.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Pitch outline</p>
                    <ol className="space-y-1 list-decimal pl-4">
                      {professionalBrief.pitchOutline.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  </>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Creative hook</p>
                <p>{professionalBrief.creativeHook}</p>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Visual mood</p>
                <p>{professionalBrief.visualMood}</p>
                {professionalBrief.paletteIdeas.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Palette ideas</p>
                    <ul className="space-y-1">
                      {professionalBrief.paletteIdeas.map((idea) => (
                        <li key={idea} className="flex gap-2">
                          <Palette className="mt-0.5 h-3 w-3 text-amber-300" aria-hidden="true" />
                          <span>{idea}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Canvas prompt</p>
                <p>{professionalBrief.canvasPrompt}</p>
                <p className="text-[10px] text-amber-300/70">Method: {professionalBrief.method}</p>
              </motion.div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {deckMode === "discover" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          {contextChips.length > 0
            ? contextChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-700/70 bg-neutral-900/60 px-3 py-1"
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </span>
              ))
            : card.channels.map((channel) => (
                <span
                  key={channel}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> {channel}
                </span>
              ))}
          {contextChips.length === 0 && card.translationProvider && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-600/40 bg-sky-950/30 px-3 py-1 text-sky-200">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Translated via {card.translationProvider}
            </span>
          )}
          {contextChips.length === 0 && card.language && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700/60 bg-neutral-900/60 px-3 py-1 text-neutral-200">
              <Languages className="h-3 w-3" aria-hidden="true" /> Original language: {card.language.toUpperCase()}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {card.citations.map((citation) => (
          <Link
            key={citation.url}
            href={citation.url}
            target="_blank"
            className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-300 hover:border-neutral-700"
          >
            <span className="block text-neutral-500">Source</span>
            <span className="block truncate text-neutral-200">{citation.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {DECK_ACTIONS.map((action) => (
          <DeckActionButton key={action} action={action} onAction={onAction} disabled={!card} />
        ))}
      </div>
    </motion.article>
  );
}
