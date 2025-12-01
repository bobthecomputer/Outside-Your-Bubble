'use client';

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type React from "react";

import { DeckCardPanel } from "@/components/deck";
import type {
  DeckCard,
  DeckMode,
  ProfessionalBriefResult,
  StudySuggestionResult,
  SwipeAction,
} from "@/types/deck";

type ContextChip = { id: string; label: string; description: string; icon: React.ReactNode };
type CardAnimation = {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  exit: Record<string, unknown>;
  transition: Record<string, unknown>;
};

type DeckCardContainerProps = {
  loading: boolean;
  error: string | null;
  card: DeckCard | null;
  contextChips: ContextChip[];
  deckMode: DeckMode;
  expanded: boolean;
  onToggleExpand: () => void;
  cardAnimation: CardAnimation;
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
  publishedAtText?: string | null;
};

export function DeckCardContainer({
  loading,
  error,
  card,
  contextChips,
  deckMode,
  expanded,
  onToggleExpand,
  cardAnimation,
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
  publishedAtText,
}: DeckCardContainerProps) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            className="flex h-64 items-center justify-center rounded-2xl border border-neutral-900 bg-neutral-950/70"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" aria-hidden="true" />
            <span className="sr-only">Loading deck</span>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.2 }}
            className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-6 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </motion.div>
        ) : card ? (
          <DeckCardPanel
            card={card}
            contextChips={contextChips}
            deckMode={deckMode}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            cardAnimation={cardAnimation}
            publishedAtText={publishedAtText}
            bulletVariants={bulletVariants}
            prefersReducedMotion={prefersReducedMotion}
            instructionsId={instructionsId}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onOpenEvidence={onOpenEvidence}
            onShareOpen={onShareOpen}
            shareEnabled={shareEnabled}
            onAction={onAction}
            cardRef={cardRef}
            focusTargetSeconds={focusTargetSeconds}
            focusDashOffset={focusDashOffset}
            dwellSeconds={dwellSeconds}
            dwellProgress={dwellProgress}
            noteFieldId={noteFieldId}
            noteHintId={noteHintId}
            noteValue={noteValue}
            onNoteChange={onNoteChange}
            studyTopic={studyTopic}
            setStudyTopic={setStudyTopic}
            studyModel={studyModel}
            setStudyModel={setStudyModel}
            studySuggestion={studySuggestion}
            studyLoading={studyLoading}
            studyError={studyError}
            onStudySuggestion={onStudySuggestion}
            professionalPersona={professionalPersona}
            setProfessionalPersona={setProfessionalPersona}
            professionalModel={professionalModel}
            setProfessionalModel={setProfessionalModel}
            professionalBrief={professionalBrief}
            professionalLoading={professionalLoading}
            professionalError={professionalError}
            onProfessionalBrief={onProfessionalBrief}
          />
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-neutral-900 bg-neutral-950/70 p-10 text-center text-sm text-neutral-400"
          >
            You have swiped through everything for now. Refresh to fetch a new slate.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
