import type { NormalizedCitation } from "@/lib/citations";
import type { ItemTier } from "@prisma/client";

export type DeckMode = "discover" | "study" | "professional" | "random";

export type SwipeAction = "left" | "right" | "up" | "down";

export type DeckCardReason = string;

export type DeckCardView = {
  cardId: string;
  itemId: string;
  headline: string;
  summary: string;
  bullets: string[];
  reason: DeckCardReason;
  tier: ItemTier;
  rank: number;
  topic?: { id: string; slug: string; label: string } | null;
  topicDetails?: {
    slug: string;
    label: string;
    group: string;
    subcategory?: string | null;
    tags: string[];
    professional: boolean;
    defaultMode: string;
  } | null;
  publishedAt?: string;
  source: { title?: string | null; url: string; countryCode?: string | null; language?: string | null };
  citations: NormalizedCitation[];
  regionTag?: string | null;
  excerpt?: string | null;
  contextSummary?: string | null;
  contextBullets: string[];
  studyPrompts: string[];
  channels: string[];
  translationProvider?: string | null;
  language?: string | null;
  contextMetadata?: Record<string, unknown> | null;
};

export type DeckCard = DeckCardView;

export type RandomSubject = {
  slug: string;
  label: string;
  group: string;
  tags: string[];
  professional: boolean;
  parents: string[];
  path?: string[];
};

export type StudySuggestionResult = {
  topic: string;
  category: string;
  spotlightSubject: string;
  questions: string[];
  presentationPrompt: string;
  presentationQuestion: string;
  impactHints: string[];
  method: string;
};

export type ProfessionalBriefResult = {
  topic: string;
  category: string;
  keyPoints: string[];
  creativeHook: string;
  pitchOutline: string[];
  visualMood: string;
  paletteIdeas: string[];
  canvasPrompt: string;
  method: string;
};

export type EvidenceEntry = {
  label: string;
  url?: string;
  detail?: string;
};

export type EvidenceChip = {
  code: "Source" | "Method" | "Contradiction";
  entries: EvidenceEntry[];
};

export type EvidenceDrawer = {
  itemId: string;
  headline?: string | null;
  chips: EvidenceChip[];
};

export type LearningStepStatus = "pending" | "seen" | "done" | "skipped";

export type LearningArticleStep = {
  id: string;
  kind: "article";
  itemId: string;
  title: string;
  url: string;
  summary: string;
  highlights: string[];
  status: LearningStepStatus;
};

export type QuizQuestion = {
  id: string;
  type: "recall" | "multiple_choice";
  prompt: string;
  answer: string;
  choices?: string[];
};

export type LearningQuizStep = {
  id: string;
  kind: "quiz";
  title: string;
  questions: QuizQuestion[];
  impactHints: string[];
  status: LearningStepStatus;
};

export type LearningStep = LearningArticleStep | LearningQuizStep;

export type LearningPathView = {
  id: string;
  status: string;
  required: number;
  progress: number;
  topic?: { slug: string; label: string } | null;
  topicId?: string | null;
  steps: LearningStep[];
  createdAt: string;
  updatedAt: string;
};

export type AchievementResponse = {
  achievements: Array<{
    id: string;
    code: string;
    earnedAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
  message?: string;
};

export type AchievementToast = {
  id: string;
  title: string;
  description: string;
};

export type ShareDialogState = {
  title: string;
  summary: string;
  url: string;
  noveltyAngle: string;
  partners: string[];
  contextSummary: string;
  studyPromptsText: string;
  channels: string[];
  originalLanguage?: string | null;
  translationProvider?: string | null;
  metadata?: Record<string, unknown> | null;
  status: "idle" | "submitting" | "success" | "error";
  message: string | null;
};
