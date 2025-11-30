"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpenCheck,
  Bookmark,
  Contrast,
  ChevronDown,
  ChevronUp,
  BriefcaseBusiness,
  Globe2,
  Info,
  Languages,
  Loader2,
  Palette,
  PenLine,
  Radio,
  RefreshCw,
  Shuffle,
  Sparkles,
  Timer,
} from "lucide-react";

import { defaultPartnerCodes, listBetaPartners } from "@/lib/partners";
import {
  AchievementToastStack,
  DeckActionButton,
  DECK_ACTIONS,
  EvidenceDialog,
  LearningPathSheet,
} from "@/components/deck";
import type {
  AchievementResponse,
  AchievementToast,
  DeckCard,
  DeckMode,
  EvidenceDrawer,
  LearningPathView,
  ProfessionalBriefResult,
  RandomSubject,
  ShareDialogState,
  StudySuggestionResult,
  SwipeAction,
} from "@/types/deck";

const BETA_SHARE_ENABLED = process.env.NEXT_PUBLIC_BETA_SHARE_ENABLED === "true";
const BETA_PARTNERS = listBetaPartners();

const ACHIEVEMENT_COPY: Record<string, { title: string; description: string }> = {
  bubble_popper: {
    title: "Bubble Popper",
    description: "You swiped outside your usual comfort zone for the first time.",
  },
  wider_view_bronze: {
    title: "Wider-View Bronze",
    description: "You dove into three fresh topics in a single day.",
  },
  mirror_thinker: {
    title: "Mirror Thinker",
    description: "You inspected ten evidence drawers to challenge assumptions.",
  },
};

function formatDate(value?: string) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return null;
  }
}

function useLocalStorageBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(key);
    if (raw === "true" || raw === "false") {
      setValue(raw === "true");
    }
  }, [key]);

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, String(next));
      }
    },
    [key],
  );

  return [value, update] as const;
}

const MIN_SWIPE_DISTANCE = 60;

async function fetchDeckCards(): Promise<DeckCard[]> {
  const response = await fetch("/api/deck", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load deck");
  }
  const data = (await response.json()) as { cards: DeckCard[] };
  return data.cards.map((card) => ({
    ...card,
    contextBullets: Array.isArray(card.contextBullets) ? card.contextBullets : [],
    studyPrompts: Array.isArray(card.studyPrompts) ? card.studyPrompts : [],
    channels: Array.isArray(card.channels) ? card.channels : [],
    contextMetadata: card.contextMetadata ?? null,
  }));
}

async function fetchRandomSubject(options: {
  group?: string | null;
  professional?: boolean;
} = {}): Promise<RandomSubject | null> {
  const params = new URLSearchParams();
  if (options.group) {
    params.set("group", options.group);
  }
  if (typeof options.professional === "boolean") {
    params.set("professional", String(options.professional));
  }
  const response = await fetch(`/api/random/subject${params.toString() ? `?${params.toString()}` : ""}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch random subject");
  }
  const payload = (await response.json()) as { subject?: Record<string, unknown> | null };
  const subject = payload.subject;
  if (!subject || typeof subject !== "object") return null;
  const tagsRaw = (subject as { tags?: unknown }).tags;
  const parentsRaw = (subject as { parents?: unknown }).parents;
  const pathRaw = (subject as { path?: unknown }).path;
  const tags = Array.isArray(tagsRaw)
    ? (tagsRaw as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const parents = Array.isArray(parentsRaw)
    ? (parentsRaw as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const path = Array.isArray(pathRaw)
    ? (pathRaw as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const slugValue = (subject as { slug?: unknown }).slug;
  const labelValue = (subject as { label?: unknown }).label;
  const groupValue = (subject as { group?: unknown }).group;
  return {
    slug: typeof slugValue === "string" ? slugValue : "",
    label: typeof labelValue === "string" ? labelValue : "",
    group: typeof groupValue === "string" ? groupValue : "",
    tags,
    professional: Boolean((subject as { professional?: unknown }).professional),
    parents,
    path,
  } satisfies RandomSubject;
}

async function requestStudySuggestion(payload: {
  itemId: string;
  studyTopic: string;
  categorySlug: string;
  mode: string;
}): Promise<StudySuggestionResult> {
  const response = await fetch("/api/study/suggest", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || !("suggestion" in body)) {
    const message =
      (body as { error?: string; message?: string } | null)?.error ??
      (body as { error?: string; message?: string } | null)?.message ??
      "Failed to generate study suggestion";
    throw new Error(message);
  }
  const suggestion = (body as { suggestion: Record<string, unknown> }).suggestion;
  const questions = Array.isArray(suggestion.questions)
    ? (suggestion.questions as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const impactHints = Array.isArray(suggestion.impact_hints)
    ? (suggestion.impact_hints as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const spotlight =
    typeof suggestion.spotlight_subject === "string"
      ? (suggestion.spotlight_subject as string)
      : typeof (suggestion as { spotlightSubject?: unknown }).spotlightSubject === "string"
        ? ((suggestion as { spotlightSubject?: unknown }).spotlightSubject as string)
        : payload.studyTopic;
  const presentationQuestion =
    typeof suggestion.presentation_question === "string"
      ? (suggestion.presentation_question as string)
      : typeof (suggestion as { presentationQuestion?: unknown }).presentationQuestion === "string"
        ? ((suggestion as { presentationQuestion?: unknown }).presentationQuestion as string)
        : `How would you explain ${spotlight} to peers studying ${payload.studyTopic}?`;
  return {
    topic: typeof suggestion.topic === "string" ? suggestion.topic : payload.studyTopic,
    category: typeof suggestion.category === "string" ? suggestion.category : payload.categorySlug,
    spotlightSubject: spotlight,
    questions,
    presentationPrompt:
      typeof suggestion.presentation_prompt === "string" ? suggestion.presentation_prompt : "Frame this topic succinctly.",
    presentationQuestion,
    impactHints,
    method: typeof suggestion.method === "string" ? suggestion.method : "heuristic",
  };
}

async function requestProfessionalBrief(payload: {
  itemId: string;
  categorySlug: string;
  persona: "strategist" | "designer" | "investor";
  mode: string;
}): Promise<ProfessionalBriefResult> {
  const response = await fetch("/api/professional/brief", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || !("brief" in body)) {
    const message =
      (body as { error?: string; message?: string } | null)?.error ??
      (body as { error?: string; message?: string } | null)?.message ??
      "Failed to build professional brief";
    throw new Error(message);
  }
  const brief = (body as { brief: Record<string, unknown> }).brief;
  const keyPoints = Array.isArray(brief.key_points)
    ? (brief.key_points as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const pitchOutline = Array.isArray(brief.pitch_outline)
    ? (brief.pitch_outline as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  const paletteIdeas = Array.isArray(brief.palette_ideas)
    ? (brief.palette_ideas as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    topic: typeof brief.topic === "string" ? brief.topic : payload.categorySlug,
    category: typeof brief.category === "string" ? brief.category : payload.categorySlug,
    keyPoints,
    creativeHook:
      typeof brief.creative_hook === "string"
        ? brief.creative_hook
        : "Craft a hook that ties this development to your audience's urgent need.",
    pitchOutline,
    visualMood:
      typeof (brief as { visual_mood?: unknown }).visual_mood === "string"
        ? ((brief as { visual_mood?: unknown }).visual_mood as string)
        : "Translate the story into a mood board ready for painting or presentation.",
    paletteIdeas,
    canvasPrompt:
      typeof (brief as { canvas_prompt?: unknown }).canvas_prompt === "string"
        ? ((brief as { canvas_prompt?: unknown }).canvas_prompt as string)
        : "Sketch a canvas that makes the insight tangible for clients.",
    method: typeof brief.method === "string" ? brief.method : "heuristic",
  };
}

async function fetchEvidence(itemId: string): Promise<EvidenceDrawer> {
  const response = await fetch(`/api/evidence/${itemId}`, { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error((payload as { message?: string } | null)?.message ?? "Failed to load evidence");
  }
  return (await response.json()) as EvidenceDrawer;
}

async function postSwipe(payload: { cardId: string; action: SwipeAction; ms?: number }): Promise<void> {
  const response = await fetch("/api/swipe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok && response.status !== 401) {
    const body = await response.json().catch(() => null);
    throw new Error((body as { message?: string } | null)?.message ?? "Failed to record swipe");
  }
}

async function startLearningPath(topicId: string | undefined): Promise<LearningPathView> {
  const response = await fetch("/api/learning/path", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topicId ? { topicId } : {}),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = (body as { message?: string } | null)?.message ?? "Failed to start learning path";
    throw new Error(message);
  }
  return (await response.json()) as LearningPathView;
}

async function updateLearningStep(stepId: string, status: "seen" | "done" | "skipped"): Promise<LearningPathView> {
  const response = await fetch("/api/learning/progress", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, status }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = (body as { message?: string } | null)?.message ?? "Failed to update progress";
    throw new Error(message);
  }
  return (await response.json()) as LearningPathView;
}

async function fetchAchievements(): Promise<AchievementResponse> {
  const response = await fetch("/api/achievements", { credentials: "include" });
  if (!response.ok) {
    const fallback = await response.json().catch(() => ({ achievements: [] }));
    return fallback as AchievementResponse;
  }
  return (await response.json()) as AchievementResponse;
}

export default function DeckPage() {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<EvidenceDrawer | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathView | null>(null);
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([]);
  const [achievementsEnabled, setAchievementsEnabled] = useLocalStorageBoolean("oyb:deck:achievements", true);
  const [randomModeEnabled, setRandomModeEnabled] = useLocalStorageBoolean("oyb:deck:random-mode", false);
  const [studyModeEnabled, setStudyModeEnabled] = useLocalStorageBoolean("oyb:deck:study-mode", false);
  const [professionalModeEnabled, setProfessionalModeEnabled] = useLocalStorageBoolean(
    "oyb:deck:professional-mode",
    false,
  );
  const [highContrast, setHighContrast] = useLocalStorageBoolean("oyb:deck:high-contrast", false);
  const [learningTopicId, setLearningTopicId] = useState<string | undefined>();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState<ShareDialogState>({
    title: "",
    summary: "",
    url: "",
    noveltyAngle: "",
    partners: [],
    contextSummary: "",
    studyPromptsText: "",
    channels: [],
    originalLanguage: null,
    translationProvider: null,
    metadata: null,
    status: "idle",
    message: null,
  });
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [randomSubject, setRandomSubject] = useState<RandomSubject | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomError, setRandomError] = useState<string | null>(null);
  const [studyTopic, setStudyTopic] = useState("");
  const [studyModel, setStudyModel] = useState("quen-3.4b");
  const [studySuggestion, setStudySuggestion] = useState<StudySuggestionResult | null>(null);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [professionalPersona, setProfessionalPersona] = useState<"strategist" | "designer" | "investor">("strategist");
  const [professionalModel, setProfessionalModel] = useState("quen-3.4b");
  const [professionalBrief, setProfessionalBrief] = useState<ProfessionalBriefResult | null>(null);
  const [professionalLoading, setProfessionalLoading] = useState(false);
  const [professionalError, setProfessionalError] = useState<string | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const focusTargetSeconds = 45;
  const focusRadius = 20;
  const focusCircumference = 2 * Math.PI * focusRadius;
  const dwellProgress = Math.min(1, focusTargetSeconds === 0 ? 0 : dwellSeconds / focusTargetSeconds);
  const focusDashOffset = focusCircumference * (1 - dwellProgress);
  const deckMode: DeckMode = randomModeEnabled
    ? "random"
    : professionalModeEnabled
      ? "professional"
      : studyModeEnabled
        ? "study"
        : "discover";

  const evidenceCache = useRef(new Map<string, EvidenceDrawer>());
  const seenAchievements = useRef(new Set<string>());
  const initialAchievementsLoaded = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const cardShownAt = useRef<number>(Date.now());
  const cardFocusRef = useRef<HTMLElement | null>(null);
  const initialFocusHandled = useRef(false);
  const instructionsId = useId();
  const noteKeyRef = useRef<string | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialModeAnnouncement = useRef(true);
  const initialAchievementAnnouncement = useRef(true);
  const initialContrastAnnouncement = useRef(true);

  const currentCard = cards[currentIndex] ?? null;
  const noteFieldId = currentCard ? `study-notes-${currentCard.itemId}` : "study-notes";
  const noteHintId = `${noteFieldId}-hint`;
  const partnerOptions = useMemo(() => BETA_PARTNERS, []);
  const structuredMeta = useMemo(() => {
    if (!currentCard?.contextMetadata || typeof currentCard.contextMetadata !== "object") {
      return null;
    }
    const meta = currentCard.contextMetadata as {
      structured?: {
        siteName?: unknown;
        section?: unknown;
        authors?: unknown;
        ampUrl?: unknown;
        alternateFeeds?: unknown;
        oEmbed?: unknown;
      } | null;
      alternateFeeds?: unknown;
      oEmbed?: unknown;
    } | null;
    const structured = meta?.structured;
    const structuredRecord = structured && typeof structured === "object" ? (structured as Record<string, unknown>) : {};
    const siteName = typeof structuredRecord["siteName"] === "string" ? (structuredRecord["siteName"] as string) : null;
    const section = typeof structuredRecord["section"] === "string" ? (structuredRecord["section"] as string) : null;
    const ampUrl = typeof structuredRecord["ampUrl"] === "string" ? (structuredRecord["ampUrl"] as string) : null;
    const authorsRaw = structuredRecord["authors"];
    const authors = Array.isArray(authorsRaw)
      ? (authorsRaw as unknown[])
          .map((entry) => {
            if (typeof entry === "string") return entry;
            if (entry && typeof entry === "object" && "name" in entry) {
              const name = (entry as { name?: unknown }).name;
              return typeof name === "string" ? name : null;
            }
            return null;
          })
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const normalizeList = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return value
          .map((entry) => (typeof entry === "string" ? entry.trim() : null))
          .filter((entry): entry is string => Boolean(entry));
      }
      if (typeof value === "string") {
        return value
          .split(/[,\n]/)
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
      }
      return [];
    };
    const alternateFeeds = [
      ...normalizeList(structuredRecord["alternateFeeds"]),
      ...normalizeList(meta?.alternateFeeds),
    ];
    const oEmbedRaw = structuredRecord["oEmbed"] && typeof structuredRecord["oEmbed"] === "object"
      ? (structuredRecord["oEmbed"] as Record<string, unknown>)
      : typeof meta?.oEmbed === "object" && meta?.oEmbed
        ? (meta.oEmbed as Record<string, unknown>)
        : null;
    const oEmbed = oEmbedRaw
      ? {
          title: typeof oEmbedRaw.title === "string" ? (oEmbedRaw.title as string) : null,
          provider: typeof oEmbedRaw.provider === "string" ? (oEmbedRaw.provider as string) : null,
          author: typeof oEmbedRaw.author === "string" ? (oEmbedRaw.author as string) : null,
          description: typeof oEmbedRaw.description === "string" ? (oEmbedRaw.description as string) : null,
          url: typeof oEmbedRaw.url === "string" ? (oEmbedRaw.url as string) : null,
        }
      : null;
    return { siteName, section, authors, ampUrl, alternateFeeds, oEmbed };
  }, [currentCard?.contextMetadata]);

  const contextChips = useMemo(() => {
    if (!currentCard) {
      return [] as Array<{ id: string; label: string; description: string; icon: ReactNode }>;
    }
    const chips: Array<{ id: string; label: string; description: string; icon: ReactNode }> = [];
    const topicDetails = currentCard.topicDetails;
    if (topicDetails) {
      chips.push({
        id: "topic-group",
        label: topicDetails.group,
        description: "Category group",
        icon: <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />,
      });
      if (topicDetails.subcategory) {
        chips.push({
          id: "topic-sub",
          label: topicDetails.subcategory,
          description: "Sub-category",
          icon: <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />,
        });
      }
      if (topicDetails.tags.length > 0) {
        chips.push({
          id: "topic-tags",
          label: topicDetails.tags.slice(0, 3).join(", "),
          description:
            topicDetails.tags.length > 3
              ? `+${topicDetails.tags.length - 3} additional tags`
              : "Topical keywords",
          icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />,
        });
      }
      if (topicDetails.professional) {
        chips.push({
          id: "topic-professional",
          label: "Professional tier",
          description: "Optimised for client deliverables",
          icon: <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />,
        });
      }
    }
    if (structuredMeta?.siteName) {
      chips.push({
        id: "site",
        label: structuredMeta.siteName,
        description: "Publishing outlet",
        icon: <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (structuredMeta?.section) {
      chips.push({
        id: "section",
        label: structuredMeta.section,
        description: "Beat or coverage section",
        icon: <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (structuredMeta?.authors && structuredMeta.authors.length > 0) {
      chips.push({
        id: "authors",
        label: structuredMeta.authors.slice(0, 2).join(", "),
        description:
          structuredMeta.authors.length > 2
            ? `+${structuredMeta.authors.length - 2} additional contributors`
            : "Primary reporters",
        icon: <PenLine className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    const language = currentCard.language ?? currentCard.source.language ?? null;
    if (language) {
      chips.push({
        id: "language",
        label: language.toUpperCase(),
        description: "Detected language",
        icon: <Languages className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (currentCard.translationProvider) {
      chips.push({
        id: "translation",
        label: currentCard.translationProvider,
        description: "Translation provider",
        icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (currentCard.channels.length > 0) {
      chips.push({
        id: "channels",
        label: `${currentCard.channels.length} channels`,
        description: currentCard.channels.join(", "),
        icon: <Radio className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (structuredMeta?.alternateFeeds && structuredMeta.alternateFeeds.length > 0) {
      chips.push({
        id: "feeds",
        label: `${structuredMeta.alternateFeeds.length} alternate feeds`,
        description: structuredMeta.alternateFeeds.slice(0, 3).join(", "),
        icon: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (structuredMeta?.oEmbed?.provider) {
      chips.push({
        id: "oembed",
        label: structuredMeta.oEmbed.provider,
        description: structuredMeta.oEmbed.title ?? "Referenced via oEmbed",
        icon: <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    if (structuredMeta?.ampUrl) {
      chips.push({
        id: "amp",
        label: "AMP available",
        description: structuredMeta.ampUrl,
        icon: <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />,
      });
    }
    return chips;
  }, [currentCard, structuredMeta]);

  const bulletVariants = useMemo(
    () =>
      prefersReducedMotion
        ? undefined
        : {
            hidden: { opacity: 0, y: 6 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
          },
    [prefersReducedMotion],
  );

  const cardAnimation = useMemo(
    () =>
      prefersReducedMotion
        ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.15 },
          }
        : {
            initial: { opacity: 0, y: 24, scale: 0.98 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: -24, scale: 0.98 },
            transition: { duration: 0.3, ease: "easeOut" as const },
          },
    [prefersReducedMotion],
  );

  useEffect(() => {
    if (!currentCard) {
      setNoteValue("");
      noteKeyRef.current = null;
      return;
    }
    if (typeof window === "undefined") return;
    const key = `oyb:deck:notes:${currentCard.itemId}`;
    noteKeyRef.current = key;
    const stored = window.localStorage.getItem(key);
    setNoteValue(stored ?? "");
  }, [currentCard]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNoteValue(value);
      if (typeof window !== "undefined" && noteKeyRef.current) {
        window.localStorage.setItem(noteKeyRef.current, value);
      }
    },
    [],
  );

  const loadDeck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchDeckCards();
      setCards(fetched);
      setCurrentIndex(0);
      setExpanded(false);
      cardShownAt.current = Date.now();
    } catch (deckError) {
      setError(deckError instanceof Error ? deckError.message : "Failed to load deck");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeck().catch(() => undefined);
  }, [loadDeck]);

  const refreshAchievements = useCallback(
    async (options: { suppressToasts?: boolean } = {}) => {
      const { suppressToasts = false } = options;
      const data = await fetchAchievements();
      const newToasts: AchievementToast[] = [];
      for (const achievement of data.achievements) {
        if (seenAchievements.current.has(achievement.id)) continue;
        seenAchievements.current.add(achievement.id);
        if (!achievementsEnabled || suppressToasts) continue;
        const copy = ACHIEVEMENT_COPY[achievement.code];
        if (copy) {
          newToasts.push({ id: achievement.id, title: copy.title, description: copy.description });
        }
      }
      if (newToasts.length > 0) {
        setAchievementToasts((prev) => [...prev, ...newToasts]);
      }
    },
    [achievementsEnabled],
  );

  useEffect(() => {
    if (initialAchievementsLoaded.current) return;
    initialAchievementsLoaded.current = true;
    refreshAchievements({ suppressToasts: true }).catch(() => undefined);
  }, [refreshAchievements]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAchievementToasts((prev) => prev.slice(1));
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!currentCard) return;
    cardShownAt.current = Date.now();
    setDwellSeconds(0);
    if (dwellTimerRef.current) {
      clearInterval(dwellTimerRef.current);
    }
    dwellTimerRef.current = setInterval(() => {
      setDwellSeconds(Math.max(0, Math.floor((Date.now() - cardShownAt.current) / 1000)));
    }, 1000);
    return () => {
      if (dwellTimerRef.current) {
        clearInterval(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };
  }, [currentCard]);

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current) {
        clearInterval(dwellTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentCard) return;
    const summaryForAnnouncement = currentCard.contextSummary?.length
      ? currentCard.contextSummary
      : currentCard.summary;
    setLiveAnnouncement(`${currentCard.headline}. ${summaryForAnnouncement}`);
    if (cardFocusRef.current) {
      if (initialFocusHandled.current) {
        cardFocusRef.current.focus({ preventScroll: true });
      } else {
        initialFocusHandled.current = true;
      }
    }
  }, [currentCard]);

  useEffect(() => {
    if (!currentCard) return;
    setStudyTopic(currentCard.topic?.label ?? currentCard.headline);
    setStudyModel(currentCard.topicDetails?.defaultMode ?? "quen-3.4b");
    setProfessionalModel(currentCard.topicDetails?.defaultMode ?? "quen-3.4b");
    setStudySuggestion(null);
    setStudyError(null);
    setProfessionalBrief(null);
    setProfessionalError(null);
  }, [currentCard]);

  useEffect(() => {
    if (initialModeAnnouncement.current) {
      initialModeAnnouncement.current = false;
      return;
    }
    const modeMessage =
      deckMode === "study"
        ? "Study mode enabled. Context helpers visible."
        : deckMode === "professional"
          ? "Professional mode enabled. Briefing helpers ready."
          : "Discover mode enabled.";
    setLiveAnnouncement(modeMessage);
  }, [deckMode]);

  useEffect(() => {
    if (initialAchievementAnnouncement.current) {
      initialAchievementAnnouncement.current = false;
      return;
    }
    setLiveAnnouncement(
      achievementsEnabled ? "Achievement toasts enabled." : "Achievement toasts muted.",
    );
  }, [achievementsEnabled]);

  useEffect(() => {
    if (initialContrastAnnouncement.current) {
      initialContrastAnnouncement.current = false;
      return;
    }
    setLiveAnnouncement(highContrast ? "High contrast theme enabled." : "High contrast theme disabled.");
  }, [highContrast]);

  useEffect(() => {
    if (!BETA_SHARE_ENABLED) return;
    if (shareOpen && currentCard) {
      const regionFallback = currentCard.regionTag
        ? currentCard.regionTag
        : currentCard.source.countryCode
          ? `region:${currentCard.source.countryCode}`
          : undefined;
      const defaults = defaultPartnerCodes(regionFallback);
      const fallbackPartners = defaults.length > 0 ? defaults : partnerOptions.slice(0, 3).map((partner) => partner.code);
      const bulletSummary = currentCard.bullets
        .slice(0, 3)
        .map((bullet) => `• ${bullet}`)
        .join("\n");
      const contextAddendum = currentCard.contextSummary ? `\n\nContext: ${currentCard.contextSummary}` : "";
      const promptsText = currentCard.studyPrompts.join("\n");
      const metadata = currentCard.contextMetadata ?? null;
      const channels = currentCard.channels.length > 0 ? currentCard.channels : [];
      const translationProvider = currentCard.translationProvider ?? null;
      const originalLanguage = currentCard.language ?? currentCard.source.language ?? null;
      setShareState({
        title: currentCard.headline,
        summary: `${currentCard.summary}${bulletSummary ? `\n\n${bulletSummary}` : ""}${contextAddendum}`.slice(0, 800),
        url: currentCard.source.url,
        noveltyAngle: currentCard.reason.slice(0, 200),
        partners: fallbackPartners,
        contextSummary: currentCard.contextSummary ?? "",
        studyPromptsText: promptsText,
        channels,
        originalLanguage,
        translationProvider,
        metadata,
        status: "idle",
        message: null,
      });
    } else if (!shareOpen) {
      setShareState((prev) => ({
        ...prev,
        status: prev.status === "success" ? "success" : "idle",
        message: prev.status === "success" ? prev.message : null,
      }));
    }
  }, [currentCard, partnerOptions, shareOpen]);

  useEffect(() => {
    if (!BETA_SHARE_ENABLED) return;
    if (shareState.status !== "success") return;
    const timeout = setTimeout(() => setShareOpen(false), 1800);
    return () => clearTimeout(timeout);
  }, [shareState.status]);

  const handleAction = useCallback(
    async (action: SwipeAction) => {
      if (!currentCard) return;
      setExpanded(false);
      const dwell = Date.now() - cardShownAt.current;
      try {
        await postSwipe({ cardId: currentCard.cardId, action, ms: dwell });
      } catch (swipeError) {
        console.error(swipeError);
      }

      if (action === "right" && currentCard.topic?.id) {
        try {
          const path = await startLearningPath(currentCard.topic.id);
          setLearningPath(path);
          setLearningError(null);
          setLearningOpen(true);
          setLearningTopicId(currentCard.topic.id);
        } catch (learningErr) {
          setLearningError(learningErr instanceof Error ? learningErr.message : "Failed to launch learning mode");
        }
      }

      await refreshAchievements().catch(() => undefined);

      setCurrentIndex((index) => Math.min(index + 1, cards.length));
      if (randomModeEnabled) {
        setTimeout(() => {
          handleRandomSubject().catch(() => undefined);
        }, 0);
      }
    },
    [cards.length, currentCard, handleRandomSubject, randomModeEnabled, refreshAchievements],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointerStart.current) return;
      const dx = event.clientX - pointerStart.current.x;
      const dy = event.clientY - pointerStart.current.y;
      pointerStart.current = null;
      if (Math.abs(dx) < MIN_SWIPE_DISTANCE && Math.abs(dy) < MIN_SWIPE_DISTANCE) {
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        handleAction(dx > 0 ? "right" : "left");
      } else {
        handleAction(dy < 0 ? "up" : "down");
      }
    },
    [handleAction],
  );

  const togglePartner = useCallback((code: string) => {
    setShareState((prev) => {
      const exists = prev.partners.includes(code);
      if (!exists && prev.partners.length >= 5) {
        return {
          ...prev,
          status: prev.status === "success" ? "idle" : prev.status,
          message: "Choose up to five partner outlets.",
        };
      }
      const partners = exists ? prev.partners.filter((entry) => entry !== code) : [...prev.partners, code];
      return {
        ...prev,
        partners,
        status: prev.status === "submitting" ? prev.status : "idle",
        message: null,
      };
    });
  }, []);

  const handleShareSubmit = useCallback(async () => {
    if (!currentCard) return;
    const trimmedTitle = shareState.title.trim();
    if (trimmedTitle.length < 6) {
      setShareState((prev) => ({
        ...prev,
        status: "error",
        message: "Add a descriptive title before pitching.",
      }));
      return;
    }
    if (shareState.partners.length === 0) {
      setShareState((prev) => ({
        ...prev,
        status: "error",
        message: "Choose at least one partner outlet.",
      }));
      return;
    }

    const trimmedSummary = shareState.summary.trim();
    const trimmedAngle = shareState.noveltyAngle.trim();
    const studyPrompts = shareState.studyPromptsText
      .split(/\n+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 6);
    const selectedChannels = shareState.channels.length > 0 ? shareState.channels : currentCard.channels;
    const channels = Array.from(new Set(selectedChannels.filter((entry) => entry && entry.trim().length > 0))).slice(0, 6);
    const contextSummary = shareState.contextSummary.trim();
    const regionTag = currentCard.regionTag ?? (currentCard.source.countryCode ? `region:${currentCard.source.countryCode}` : undefined);
    const originalLanguage = shareState.originalLanguage ?? currentCard.language ?? currentCard.source.language ?? null;
    const translationProvider = shareState.translationProvider ?? currentCard.translationProvider ?? null;
    const metadata = shareState.metadata ?? currentCard.contextMetadata ?? null;

    const payload = {
      itemId: currentCard.itemId,
      url: (shareState.url || currentCard.source.url).trim(),
      title: trimmedTitle,
      summary: trimmedSummary.length > 0 ? trimmedSummary : undefined,
      noveltyAngle: trimmedAngle.length > 0 ? trimmedAngle : undefined,
      partnerTargets: shareState.partners,
      tags: regionTag ? [regionTag] : undefined,
      contextSummary: contextSummary ? contextSummary : undefined,
      studyPrompts: studyPrompts.length ? studyPrompts : undefined,
      channels: channels.length ? channels : undefined,
      originalLanguage: originalLanguage ?? undefined,
      translationProvider: translationProvider ?? undefined,
      metadata: metadata ?? undefined,
    };

    setShareState((prev) => ({ ...prev, status: "submitting", message: null }));

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Partner submission failed");
      }

      const data = (await response.json()) as { partnerTargets?: string[] | null };
      const targets = Array.isArray(data.partnerTargets) && data.partnerTargets.length > 0 ? data.partnerTargets : payload.partnerTargets;

      setShareState((prev) => ({
        ...prev,
        status: "success",
        message: `Shared with ${targets.join(", ")}.`,
      }));
    } catch (shareError) {
      setShareState((prev) => ({
        ...prev,
        status: "error",
        message: shareError instanceof Error ? shareError.message : "Unable to reach partner mesh.",
      }));
    }
  }, [currentCard, shareState]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!currentCard) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
      }
      switch (event.key) {
        case "ArrowLeft":
          handleAction("left");
          break;
        case "ArrowRight":
          handleAction("right");
          break;
        case "ArrowUp":
          handleAction("up");
          break;
        case "ArrowDown":
          handleAction("down");
          break;
        case " ":
          setExpanded((prev) => !prev);
          break;
        default:
          break;
      }
    },
    [currentCard, handleAction],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const openEvidenceDrawer = useCallback(async () => {
    if (!currentCard) return;
    setDrawerOpen(true);
    setDrawerError(null);
    if (evidenceCache.current.has(currentCard.itemId)) {
      setDrawerData(evidenceCache.current.get(currentCard.itemId) ?? null);
      return;
    }
    setDrawerLoading(true);
    try {
      const data = await fetchEvidence(currentCard.itemId);
      evidenceCache.current.set(currentCard.itemId, data);
      setDrawerData(data);
    } catch (drawerErr) {
      setDrawerError(drawerErr instanceof Error ? drawerErr.message : "Failed to open evidence");
    } finally {
      setDrawerLoading(false);
    }
  }, [currentCard]);

  const handleLearningRefresh = useCallback(async () => {
    if (!learningPath?.id) return;
    try {
      const refreshed = await startLearningPath(learningTopicId ?? learningPath.topicId ?? undefined);
      setLearningPath(refreshed);
      if (!learningTopicId && refreshed.topicId) {
        setLearningTopicId(refreshed.topicId);
      }
    } catch (refreshErr) {
      setLearningError(refreshErr instanceof Error ? refreshErr.message : "Failed to refresh path");
    }
  }, [learningPath, learningTopicId]);

  const handleUpdateStep = useCallback(
    async (stepId: string, status: "seen" | "done" | "skipped") => {
      try {
        setUpdatingStep(stepId);
        const updated = await updateLearningStep(stepId, status);
        setLearningPath(updated);
        setLearningError(null);
        if (!learningTopicId && updated.topicId) {
          setLearningTopicId(updated.topicId);
        }
        await refreshAchievements();
      } catch (updateErr) {
        setLearningError(updateErr instanceof Error ? updateErr.message : "Failed to update learning path");
      } finally {
        setUpdatingStep(null);
      }
    },
    [learningTopicId, refreshAchievements],
  );

  const handleRandomSubject = useCallback(async () => {
    setRandomLoading(true);
    setRandomError(null);
    try {
      const options: { group?: string; professional?: boolean } = {};
      if (deckMode === "professional") {
        options.professional = true;
        if (currentCard?.topicDetails?.group) {
          options.group = currentCard.topicDetails.group;
        }
      } else if (deckMode === "study") {
        if (currentCard?.topicDetails?.group) {
          options.group = currentCard.topicDetails.group;
        }
        options.professional = currentCard?.topicDetails?.professional ?? false;
      } else if (deckMode === "discover") {
        if (currentCard?.topicDetails?.group) {
          options.group = currentCard.topicDetails.group;
        }
      }
      const subject = await fetchRandomSubject({
        group: options.group,
        professional: options.professional,
      });
      setRandomSubject(subject);
      if (subject) {
        setLiveAnnouncement(`Random subject: ${subject.label} (${subject.group}).`);
      }
    } catch (randomErr) {
      setRandomError(randomErr instanceof Error ? randomErr.message : "Unable to fetch random subject");
    } finally {
      setRandomLoading(false);
    }
  }, [currentCard, deckMode]);

  useEffect(() => {
    if (deckMode !== "random") return;
    if (randomLoading) return;
    if (randomSubject) return;
    handleRandomSubject().catch(() => undefined);
  }, [deckMode, handleRandomSubject, randomLoading, randomSubject]);

  useEffect(() => {
    if (!randomSubject) return;
    const matchIndex = cards.findIndex((card) => {
      const slug = card.topicDetails?.slug ?? card.topic?.slug;
      return slug === randomSubject.slug;
    });
    if (matchIndex >= 0) {
      setCurrentIndex(matchIndex);
    }
  }, [cards, randomSubject]);

  const applyDeckMode = useCallback(
    (mode: DeckMode) => {
      if (mode === "discover") {
        setRandomModeEnabled(false);
        setStudyModeEnabled(false);
        setProfessionalModeEnabled(false);
      } else if (mode === "study") {
        setRandomModeEnabled(false);
        setStudyModeEnabled(true);
        setProfessionalModeEnabled(false);
      } else if (mode === "professional") {
        setRandomModeEnabled(false);
        setProfessionalModeEnabled(true);
        setStudyModeEnabled(false);
      } else {
        setRandomModeEnabled(true);
        setProfessionalModeEnabled(false);
        setStudyModeEnabled(false);
        setRandomSubject(null);
      }
    },
    [setProfessionalModeEnabled, setRandomModeEnabled, setStudyModeEnabled],
  );

  const handleStudySuggestionRequest = useCallback(async () => {
    if (!currentCard) return;
    const trimmed = studyTopic.trim();
    if (!trimmed) {
      setStudyError("Add a study focus to generate suggestions.");
      return;
    }
    setStudyLoading(true);
    setStudyError(null);
    try {
      const suggestion = await requestStudySuggestion({
        itemId: currentCard.itemId,
        studyTopic: trimmed,
        categorySlug: currentCard.topicDetails?.slug ?? currentCard.topic?.slug ?? "world",
        mode: studyModel,
      });
      setStudySuggestion(suggestion);
      setLiveAnnouncement(`Study suggestion ready for ${suggestion.topic}.`);
    } catch (studyErr) {
      setStudyError(studyErr instanceof Error ? studyErr.message : "Failed to generate suggestion");
    } finally {
      setStudyLoading(false);
    }
  }, [currentCard, studyTopic, studyModel]);

  const handleProfessionalBriefRequest = useCallback(async () => {
    if (!currentCard) return;
    setProfessionalLoading(true);
    setProfessionalError(null);
    try {
      const brief = await requestProfessionalBrief({
        itemId: currentCard.itemId,
        categorySlug: currentCard.topicDetails?.slug ?? currentCard.topic?.slug ?? "world",
        persona: professionalPersona,
        mode: professionalModel,
      });
      setProfessionalBrief(brief);
      setLiveAnnouncement(`Professional brief prepared for ${brief.topic}.`);
    } catch (briefErr) {
      setProfessionalError(briefErr instanceof Error ? briefErr.message : "Failed to build brief");
    } finally {
      setProfessionalLoading(false);
    }
  }, [currentCard, professionalPersona, professionalModel]);

  const handleDismissToast = useCallback((id: string) => {
    setAchievementToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <div
      className={clsx(
        "min-h-screen text-neutral-100 transition-colors",
        highContrast ? "bg-black text-white" : "bg-neutral-950",
      )}
    >
      <a
        href="#deck-panel"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:border focus:border-emerald-500 focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-emerald-300"
      >
        Skip to current card
      </a>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
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
                      onClick={() => applyDeckMode(entry.mode)}
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
                onClick={() => setHighContrast(!highContrast)}
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
                onClick={() => setAchievementsEnabled(!achievementsEnabled)}
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
                onClick={() => handleRandomSubject().catch(() => undefined)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors",
                  "border-sky-600/50 text-sky-200 hover:border-sky-500",
                  randomLoading && "opacity-70",
                )}
                disabled={randomLoading}
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                {randomLoading ? "Picking…" : "Random subject"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-2 py-1">Median dwell target: 8s+</span>
            <span className="rounded-full border border-neutral-800 px-2 py-1">Keyboard: ← → ↑ ↓ / Space</span>
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
              onClick={() => loadDeck().catch(() => undefined)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh deck
            </button>
            {randomSubject && (
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-600/40 bg-sky-950/30 px-3 py-1 text-sky-200">
                <Shuffle className="h-3 w-3" aria-hidden="true" />
                {randomSubject.label}
                {Array.isArray(randomSubject.path) && randomSubject.path.length > 0 && (
                  <span className="text-sky-300/80">· {randomSubject.path.join(" → ")}</span>
                )}
                {randomSubject.tags.length > 0 && (
                  <span className="text-sky-300/80">
                    · {randomSubject.tags.slice(0, 2).join(", ")}
                    {randomSubject.tags.length > 2 ? "…" : ""}
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
            ) : currentCard ? (
              <motion.article
                key={currentCard.cardId}
                initial={cardAnimation.initial}
                animate={cardAnimation.animate}
                exit={cardAnimation.exit}
                transition={cardAnimation.transition}
                className="relative min-h-[420px] touch-pan-y select-none overflow-hidden rounded-3xl border border-neutral-900 bg-neutral-950/80 p-6 shadow-xl"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                id="deck-panel"
                tabIndex={-1}
                role="group"
                aria-describedby={instructionsId}
                aria-label={`Topic card: ${currentCard.headline}`}
                ref={(node) => {
                  cardFocusRef.current = node;
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400">
                      {currentCard.topic?.label ?? "Outside pick"}
                    </div>
                    <h2 className="text-2xl font-semibold text-neutral-50">{currentCard.headline}</h2>
                    <p className="text-sm text-neutral-400">{currentCard.reason}</p>
                    {formatDate(currentCard.publishedAt) && (
                      <p className="text-xs text-neutral-500">{formatDate(currentCard.publishedAt)}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3 text-right">
                    <span className="rounded-full border border-emerald-600/40 px-3 py-1 text-xs text-emerald-300">Tier {currentCard.tier}</span>
                    <Link
                      href={currentCard.source.url}
                      target="_blank"
                      aria-label="Open original source"
                      className="inline-flex items-center gap-2 rounded-full border border-sky-600/40 px-3 py-1 text-xs text-sky-300 hover:border-sky-500"
                    >
                      <Info className="h-4 w-4" aria-hidden="true" /> Visit source
                    </Link>
                    <button
                      type="button"
                      onClick={openEvidenceDrawer}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-600"
                      aria-label="Open evidence drawer"
                    >
                      <Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> Open evidence
                    </button>
                    {BETA_SHARE_ENABLED && (
                      <button
                        type="button"
                        onClick={() => setShareOpen(true)}
                        disabled={!currentCard}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 px-3 py-1 text-xs text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Pitch story to partners"
                      >
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Pitch to partners
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="text-base text-neutral-200">{currentCard.summary}</p>
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
                      {currentCard.bullets.map((bullet) => (
                        <motion.li key={bullet} className="flex gap-3" variants={bulletVariants}>
                          <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-600" aria-hidden="true" />
                          <span>{bullet}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    {expanded ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />} {expanded ? "Collapse" : "Expand"}
                  </button>
                  {currentCard.excerpt && (
                    <blockquote className="border-l-2 border-neutral-800/70 pl-4 text-sm italic text-neutral-400">
                      “{currentCard.excerpt}”
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
                      {currentCard.contextSummary ? (
                        <p className="mt-3 text-sm text-purple-100">{currentCard.contextSummary}</p>
                      ) : (
                        <p className="mt-3 text-xs text-purple-200/80">Contextual summary loading—check the evidence drawer for deeper detail.</p>
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
                      {currentCard.contextBullets.length > 0 && (
                        <ul className="mt-3 space-y-2 text-sm text-purple-100/90">
                          {currentCard.contextBullets.map((bullet) => (
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
                            <circle cx="26" cy="26" r={focusRadius} stroke="rgba(192, 132, 252, 0.2)" strokeWidth="4" fill="transparent" />
                            <circle
                              cx="26"
                              cy="26"
                              r={focusRadius}
                              stroke="rgba(192, 132, 252, 0.8)"
                              strokeWidth="4"
                              fill="transparent"
                              strokeDasharray={focusCircumference}
                              strokeDashoffset={focusDashOffset}
                              strokeLinecap="round"
                              transform="rotate(-90 26 26)"
                            />
                          </svg>
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-300">
                              <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Focus time
                            </div>
                            <p className="text-sm text-purple-100">{dwellSeconds}s / {focusTargetSeconds}s target</p>
                          </div>
                        </div>
                        <p className="text-xs text-purple-200/80">Stay with this card to unlock richer prompts and path recommendations.</p>
                      </div>
                      {currentCard.studyPrompts.length > 0 && (
                        <div className="mt-4 rounded-xl border border-purple-700/30 bg-neutral-950/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Reflection prompts</p>
                          <ul className="mt-2 space-y-2 text-sm text-purple-100/90">
                            {currentCard.studyPrompts.map((prompt) => (
                              <li key={prompt} className="flex gap-2">
                                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-purple-300" aria-hidden="true" />
                                <span>{prompt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {currentCard.channels.length > 0 && (
                        <div className="mt-4 rounded-xl border border-purple-700/30 bg-neutral-950/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-purple-300">Signal channels</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-purple-200/80">
                            {currentCard.channels.map((channel) => (
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
                          handleStudySuggestionRequest().catch(() => undefined);
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
                            <option value="quen-3.4b-thinking">Qwen 3.4b · Thinking</option>
                            <option value="quen-2.5">Qwen 2.5</option>
                            <option value="quen-2.5-thinking">Qwen 2.5 · Thinking</option>
                          </select>
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-purple-100 hover:border-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={studyLoading}
                          >
                            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                            {studyLoading ? "Synthesising…" : "Generate prompts"}
                          </button>
                          {studyError && <span className="text-xs text-rose-200">{studyError}</span>}
                        </div>
                        {studySuggestion && (
                          <div className="grid gap-3 rounded-xl border border-purple-700/40 bg-neutral-950/30 p-3 text-sm text-purple-100/90">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                              Spotlight subject
                            </p>
                            <p>{studySuggestion.spotlightSubject}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                              Presentation question
                            </p>
                            <p>{studySuggestion.presentationQuestion}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                              Questions to explore
                            </p>
                            <ul className="space-y-2">
                              {studySuggestion.questions.map((question) => (
                                <li key={question} className="flex gap-2">
                                  <Sparkles className="mt-0.5 h-3 w-3 text-purple-300" aria-hidden="true" />
                                  <span>{question}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                              Presentation prompt
                            </p>
                            <p>{studySuggestion.presentationPrompt}</p>
                            {studySuggestion.impactHints.length > 0 && (
                              <>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300">
                                  Impact hints
                                </p>
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
                      <label
                        className="mt-4 block text-xs font-semibold uppercase tracking-widest text-purple-300"
                        htmlFor={noteFieldId}
                      >
                        Study notebook
                      </label>
                      <p id={noteHintId} className="text-[11px] text-purple-200/70">
                        Notes are saved locally so you can revisit your takeaways later.
                      </p>
                      <textarea
                        id={noteFieldId}
                        aria-describedby={noteHintId}
                        value={noteValue}
                        onChange={(event) => handleNoteChange(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-purple-800/40 bg-neutral-950/60 px-3 py-2 text-sm text-purple-50 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                        placeholder="Jot down cross-check ideas, follow-up sources, or open questions."
                      />
                    </motion.section>
                  )}
                  {deckMode === "professional" && (
                    <motion.section
                      key="professional-panel"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
                      transition={{ duration: prefersReducedMotion ? 0.18 : 0.25, ease: "easeOut" }}
                      className="mt-6 rounded-2xl border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-100"
                      aria-label="Professional helpers"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
                        <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> Professional playbook
                      </div>
                      {currentCard.contextSummary ? (
                        <p className="mt-3 text-sm text-amber-100">{currentCard.contextSummary}</p>
                      ) : (
                        <p className="mt-3 text-xs text-amber-200/80">Gather context from the evidence drawer to enrich your pitch.</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(
                          [
                            { value: "strategist", label: "Strategist" },
                            { value: "designer", label: "Designer" },
                            { value: "investor", label: "Investor" },
                          ] as Array<{ value: "strategist" | "designer" | "investor"; label: string }>
                        ).map((option) => {
                          const active = professionalPersona === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setProfessionalPersona(option.value)}
                              aria-pressed={active}
                              className={clsx(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition-colors",
                                active
                                  ? "border-amber-500/60 bg-amber-500/20 text-amber-100"
                                  : "border-amber-500/30 text-amber-200/70 hover:border-amber-500/40 hover:text-amber-100",
                              )}
                            >
                              <BriefcaseBusiness className="h-3 w-3" aria-hidden="true" /> {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-amber-300">
                        Thinking model
                        <select
                          value={professionalModel}
                          onChange={(event) => setProfessionalModel(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-amber-600/40 bg-neutral-950/60 px-3 py-2 text-sm text-amber-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40"
                        >
                          <option value="quen-3.4b">Qwen 3.4b</option>
                          <option value="quen-3.4b-thinking">Qwen 3.4b · Thinking</option>
                          <option value="quen-2.5">Qwen 2.5</option>
                          <option value="quen-2.5-thinking">Qwen 2.5 · Thinking</option>
                        </select>
                      </label>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleProfessionalBriefRequest().catch(() => undefined)}
                          className="inline-flex items-center gap-2 rounded-full border border-amber-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-100 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={professionalLoading}
                        >
                          <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                          {professionalLoading ? "Shaping brief…" : "Generate brief"}
                        </button>
                        {professionalError && <span className="text-xs text-rose-200">{professionalError}</span>}
                      </div>
                      {professionalBrief && (
                        <div className="mt-4 grid gap-3 rounded-xl border border-amber-600/40 bg-neutral-950/30 p-3 text-sm text-amber-100/90">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Creative hook</p>
                          <p>{professionalBrief.creativeHook}</p>
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Visual direction</p>
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
                          {professionalBrief.keyPoints.length > 0 && (
                            <>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Key points</p>
                              <ul className="space-y-2">
                                {professionalBrief.keyPoints.map((point) => (
                                  <li key={point} className="flex gap-2">
                                    <Sparkles className="mt-0.5 h-3 w-3 text-amber-300" aria-hidden="true" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {professionalBrief.pitchOutline.length > 0 && (
                            <>
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Pitch outline</p>
                              <ol className="list-decimal space-y-1 pl-5">
                                {professionalBrief.pitchOutline.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ol>
                            </>
                          )}
                          <p className="text-[10px] text-amber-300/70">Method: {professionalBrief.method}</p>
                        </div>
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
                      : currentCard.channels.map((channel) => (
                          <span key={channel} className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1">
                            <Sparkles className="h-3 w-3" aria-hidden="true" /> {channel}
                          </span>
                        ))}
                    {contextChips.length === 0 && currentCard.translationProvider && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-600/40 bg-sky-950/30 px-3 py-1 text-sky-200">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Translated via {currentCard.translationProvider}
                      </span>
                    )}
                    {contextChips.length === 0 && currentCard.language && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700/60 bg-neutral-900/60 px-3 py-1 text-neutral-200">
                        <Info className="h-3 w-3" aria-hidden="true" /> Original language: {currentCard.language.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {currentCard.citations.map((citation) => (
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
                    <DeckActionButton key={action} action={action} onAction={handleAction} disabled={!currentCard} />
                  ))}
                </div>
              </motion.article>
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
      </main>

      <EvidenceDialog
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawer={drawerData}
        loading={drawerLoading}
        error={drawerError}
      />

      {BETA_SHARE_ENABLED && (
        <Dialog.Root open={shareOpen} onOpenChange={setShareOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-950/95 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-neutral-100">Partner pitch beta</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-neutral-400">
                      Share especially novel coverage with vetted cross-border newsrooms. Submissions stay private until a curator approves them.
                    </Dialog.Description>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShareOpen(false)}
                    className="rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                  >
                    Close
                  </button>
                </div>

                {currentCard ? (
                  <form
                    className="mt-5 space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleShareSubmit().catch(() => undefined);
                    }}
                  >
                    <label className="block text-sm font-semibold text-neutral-200">
                      Headline for partners
                      <input
                        type="text"
                        value={shareState.title}
                        maxLength={200}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            title: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder="Give partners context in a sentence"
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-neutral-200">
                      Short summary
                      <textarea
                        rows={4}
                        value={shareState.summary}
                        maxLength={800}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            summary: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder="Why this story matters and what makes it distinct"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-neutral-200">
                      Context summary
                      <textarea
                        rows={3}
                        value={shareState.contextSummary}
                        maxLength={600}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            contextSummary: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder="Add 1-2 sentences of framing the partners can quote"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-neutral-200">
                      Study prompts (one per line)
                      <textarea
                        rows={3}
                        value={shareState.studyPromptsText}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            studyPromptsText: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder={`e.g.\nWhat does this mean for ${currentCard.topic?.label ?? "the region"}?`}
                      />
                    </label>

                    {currentCard.channels.length > 0 && (
                      <fieldset className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                        <legend className="text-sm font-semibold text-neutral-200">Distribution channels</legend>
                        <p className="text-xs text-neutral-500">Toggle which discovery paths should receive this pitch.</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {currentCard.channels.map((channel) => {
                            const checked = shareState.channels.includes(channel);
                            return (
                              <label
                                key={channel}
                                className={clsx(
                                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest",
                                  checked
                                    ? "border-emerald-500/60 text-emerald-200"
                                    : "border-neutral-700 text-neutral-400 hover:border-emerald-500/40 hover:text-emerald-200",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() =>
                                    setShareState((prev) => {
                                      const next = new Set(prev.channels);
                                      if (checked) {
                                        next.delete(channel);
                                      } else {
                                        next.add(channel);
                                      }
                                      return {
                                        ...prev,
                                        channels: Array.from(next),
                                        status: prev.status === "submitting" ? prev.status : "idle",
                                        message: null,
                                      };
                                    })
                                  }
                                />
                                <Sparkles className="h-3 w-3" aria-hidden="true" /> {channel}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    )}

                    <label className="block text-sm font-semibold text-neutral-200">
                      Novel angle or context
                      <input
                        type="text"
                        value={shareState.noveltyAngle}
                        maxLength={200}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            noveltyAngle: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder="e.g. Regional coalition challenges dominant narrative"
                      />
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-sm font-semibold text-neutral-200">
                        Original language code
                        <input
                          type="text"
                          value={shareState.originalLanguage ?? ""}
                          maxLength={12}
                          onChange={(event) =>
                            setShareState((prev) => ({
                              ...prev,
                              originalLanguage: event.target.value,
                              status: prev.status === "submitting" ? prev.status : "idle",
                              message: null,
                            }))
                          }
                          className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                          placeholder={currentCard.language ?? "en"}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-neutral-200">
                        Translation provider
                        <input
                          type="text"
                          value={shareState.translationProvider ?? ""}
                          maxLength={40}
                          onChange={(event) =>
                            setShareState((prev) => ({
                              ...prev,
                              translationProvider: event.target.value,
                              status: prev.status === "submitting" ? prev.status : "idle",
                              message: null,
                            }))
                          }
                          className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                          placeholder={currentCard.translationProvider ?? "google-translate"}
                        />
                      </label>
                    </div>

                    <label className="block text-sm font-semibold text-neutral-200">
                      Canonical URL
                      <input
                        type="url"
                        value={shareState.url}
                        onChange={(event) =>
                          setShareState((prev) => ({
                            ...prev,
                            url: event.target.value,
                            status: prev.status === "submitting" ? prev.status : "idle",
                            message: null,
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                        placeholder={currentCard.source.url}
                      />
                    </label>

                    <div>
                      <p className="text-sm font-semibold text-neutral-200">Partner outlets</p>
                      <p className="text-xs text-neutral-500">Select up to five destinations for this pitch.</p>
                      <div className="mt-3 grid gap-3">
                        {partnerOptions.map((partner) => (
                          <label
                            key={partner.code}
                            className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-left text-sm text-neutral-300"
                          >
                            <input
                              type="checkbox"
                              checked={shareState.partners.includes(partner.code)}
                              onChange={() => togglePartner(partner.code)}
                              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="font-semibold text-neutral-100">{partner.name}</p>
                              <p className="text-xs text-neutral-400">{partner.description}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
                                Regions: {partner.regions.join(", ")} · Languages: {partner.languages.join(", ")}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {shareState.message && (
                      <div
                        className={clsx(
                          "rounded-2xl border px-3 py-2 text-sm",
                          shareState.status === "success"
                            ? "border-emerald-600/60 bg-emerald-950/30 text-emerald-200"
                            : shareState.status === "error"
                              ? "border-rose-600/60 bg-rose-950/30 text-rose-200"
                              : "border-sky-600/60 bg-sky-950/30 text-sky-200",
                        )}
                      >
                        {shareState.message}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setShareOpen(false)}
                        className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={shareState.status === "submitting"}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 bg-emerald-900/40 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-200 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {shareState.status === "submitting" ? "Sending…" : "Send to partner mesh"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-6 text-sm text-neutral-400">Load a card from the deck to pitch it to partners.</p>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <LearningPathSheet
        path={learningPath}
        open={learningOpen}
        onOpenChange={setLearningOpen}
        onRefresh={handleLearningRefresh}
        error={learningError}
        updatingStep={updatingStep}
        updateStep={handleUpdateStep}
      />

      {achievementsEnabled && (
        <AchievementToastStack toasts={achievementToasts} dismiss={handleDismissToast} />
      )}
    </div>
  );
}

