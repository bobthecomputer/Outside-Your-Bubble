import type {
  AchievementResponse,
  DeckCard,
  EvidenceDrawer,
  LearningPathView,
  ProfessionalBriefResult,
  RandomSubject,
  StudySuggestionResult,
  SwipeAction,
} from "@/types/deck";

export async function fetchDeckCards(): Promise<DeckCard[]> {
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

export async function fetchRandomSubject(options: {
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

export async function requestStudySuggestion(payload: {
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

export async function requestProfessionalBrief(payload: {
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

export async function fetchEvidence(itemId: string): Promise<EvidenceDrawer> {
  const response = await fetch(`/api/evidence/${itemId}`, { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error((payload as { message?: string } | null)?.message ?? "Failed to load evidence");
  }
  return (await response.json()) as EvidenceDrawer;
}

export async function postSwipe(payload: { cardId: string; action: SwipeAction; ms?: number }): Promise<void> {
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

export async function startLearningPath(topicId: string | undefined): Promise<LearningPathView> {
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

export async function updateLearningStep(stepId: string, status: "seen" | "done" | "skipped"): Promise<LearningPathView> {
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

export async function fetchAchievements(): Promise<AchievementResponse> {
  const response = await fetch("/api/achievements", { credentials: "include" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string } | null)?.error?.message ??
      (payload as { message?: string } | null)?.message ??
      "Failed to load achievements";
    return { achievements: [], message };
  }

  const achievements = (payload as { achievements?: AchievementResponse["achievements"] } | null)?.achievements;
  return {
    achievements: Array.isArray(achievements) ? achievements : [],
    message: (payload as { message?: string } | null)?.message,
  };
}
