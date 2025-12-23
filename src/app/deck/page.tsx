"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { useReducedMotion } from "framer-motion";
import {
  Bookmark,
  BriefcaseBusiness,
  ArrowUp,
  Globe2,
  Info,
  Languages,
  PenLine,
  Radio,
  Sparkles,
} from "lucide-react";

import { useDeckData } from "@/app/deck/hooks/use-deck-data";
import { useDeckSwipes } from "@/app/deck/hooks/use-deck-swipes";
import { defaultPartnerCodes, listBetaPartners } from "@/lib/partners";
import {
  AchievementToastStack,
  DeckCardContainer,
  DeckHeader,
  EvidenceDialog,
  LearningPathSheet,
  ShareDialog,
} from "@/components/deck";
import type {
  DeckMode,
  EvidenceDrawer,
  LearningPathView,
  ProfessionalBriefResult,
  RandomSubject,
  ShareDialogState,
  StudySuggestionResult,
  SwipeAction,
} from "@/types/deck";
import {
  fetchEvidence,
  fetchRandomSubject,
  postSwipe,
  requestProfessionalBrief,
  requestStudySuggestion,
  startLearningPath,
  updateLearningStep,
} from "@/app/deck/deck-api";

const BETA_SHARE_ENABLED = process.env.NEXT_PUBLIC_BETA_SHARE_ENABLED === "true";
const BETA_PARTNERS = listBetaPartners();

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

export default function DeckPage() {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<EvidenceDrawer | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPathView | null>(null);
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningError, setLearningError] = useState<string | null>(null);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);
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
  const {
    achievementToasts,
    cards,
    currentCard,
    currentIndex,
    dismissAchievementToast,
    error,
    loadDeck,
    loading,
    refreshAchievements,
    setCurrentIndex,
  } = useDeckData(achievementsEnabled);

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
  const cardShownAt = useRef<number>(Date.now());
  const cardFocusRef = useRef<HTMLElement | null>(null);
  const initialFocusHandled = useRef(false);
  const instructionsId = useId();
  const noteKeyRef = useRef<string | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialModeAnnouncement = useRef(true);
  const initialAchievementAnnouncement = useRef(true);
  const initialContrastAnnouncement = useRef(true);

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

  const loadDeckWithReset = useCallback(() => {
    return loadDeck({ onLoaded: () => setExpanded(false) }).catch(() => undefined);
  }, [loadDeck]);

  useEffect(() => {
    loadDeckWithReset();
  }, [loadDeckWithReset]);

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

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const { handlePointerDown, handlePointerUp } = useDeckSwipes({
    enabled: Boolean(currentCard),
    onAction: handleAction,
    onSpace: toggleExpanded,
  });

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
    dismissAchievementToast(id);
  }, [dismissAchievementToast]);

  return (
    <div
      className={clsx(
        "min-h-screen text-[color:var(--foreground)] transition-colors",
        highContrast ? "bg-black text-white" : "bg-[color:var(--background)]",
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
        <DeckHeader
          achievementsEnabled={achievementsEnabled}
          deckMode={deckMode}
          highContrast={highContrast}
          instructionsId={instructionsId}
          onRandomSubject={() => handleRandomSubject().catch(() => undefined)}
          onRefreshDeck={loadDeckWithReset}
          onSelectMode={applyDeckMode}
          onToggleAchievements={() => setAchievementsEnabled(!achievementsEnabled)}
          onToggleContrast={() => setHighContrast(!highContrast)}
          randomError={randomError}
          randomLoading={randomLoading}
          randomSubject={randomSubject}
        />

        <div className="relative">
          <DeckCardContainer
            loading={loading}
            error={error}
            card={currentCard}
            contextChips={contextChips}
            deckMode={deckMode}
            expanded={expanded}
            onToggleExpand={toggleExpanded}
            cardAnimation={cardAnimation}
            publishedAtText={formatDate(currentCard?.publishedAt)}
            bulletVariants={bulletVariants}
            prefersReducedMotion={prefersReducedMotion}
            instructionsId={instructionsId}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onOpenEvidence={openEvidenceDrawer}
            onShareOpen={() => setShareOpen(true)}
            shareEnabled={BETA_SHARE_ENABLED}
            onAction={handleAction}
            cardRef={(node) => {
              cardFocusRef.current = node;
            }}
            focusTargetSeconds={focusTargetSeconds}
            focusDashOffset={focusDashOffset}
            dwellSeconds={dwellSeconds}
            dwellProgress={dwellProgress}
            noteFieldId={noteFieldId}
            noteHintId={noteHintId}
            noteValue={noteValue}
            onNoteChange={handleNoteChange}
            studyTopic={studyTopic}
            setStudyTopic={setStudyTopic}
            studyModel={studyModel}
            setStudyModel={setStudyModel}
            studySuggestion={studySuggestion}
            studyLoading={studyLoading}
            studyError={studyError}
            onStudySuggestion={() => handleStudySuggestionRequest().catch(() => undefined)}
            professionalPersona={professionalPersona}
            setProfessionalPersona={setProfessionalPersona}
            professionalModel={professionalModel}
            setProfessionalModel={setProfessionalModel}
            professionalBrief={professionalBrief}
            professionalLoading={professionalLoading}
            professionalError={professionalError}
            onProfessionalBrief={() => handleProfessionalBriefRequest().catch(() => undefined)}
          />
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
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          card={currentCard}
          shareState={shareState}
          setShareState={setShareState}
          partnerOptions={partnerOptions}
          onSubmit={() => handleShareSubmit().catch(() => undefined)}
          togglePartner={togglePartner}
        />
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

