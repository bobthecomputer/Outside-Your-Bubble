type ArticleQualityVerdict = "good" | "needs_review" | "reject";

export type ArticleQualityScore = {
  verdict: ArticleQualityVerdict;
  score: number;
  reasons: string[];
};

export type ClassifierInput = {
  title?: string | null;
  summary?: string | null;
  text?: string | null;
  tags?: string[] | null;
  language?: string | null;
  source?: string | null;
};

/**
 * Lightweight heuristic classifier for article quality. Intended as a placeholder until a model-backed
 * scorer is wired in. Signals used:
 * - body length (words)
 * - summary presence/length
 * - tag richness
 * - non-empty title and language
 */
export function scoreArticleQuality(input: ClassifierInput): ArticleQualityScore {
  const reasons: string[] = [];
  let score = 0;

  const wordCount = (input.text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  if (wordCount >= 400) {
    score += 40;
    reasons.push("Body length OK");
  } else if (wordCount >= 200) {
    score += 25;
    reasons.push("Body length decent");
  } else if (wordCount > 0) {
    score += 5;
    reasons.push("Body is thin");
  } else {
    score -= 40;
    reasons.push("Missing body text");
  }

  const summaryLength = (input.summary ?? "").trim().length;
  if (summaryLength > 120) {
    score += 25;
    reasons.push("Summary present");
  } else if (summaryLength > 0) {
    score += 10;
    reasons.push("Short summary");
  } else {
    reasons.push("No summary");
  }

  const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : [];
  if (tags.length >= 3) {
    score += 15;
    reasons.push("Tags provided");
  } else if (tags.length > 0) {
    score += 5;
    reasons.push("Few tags");
  } else {
    reasons.push("No tags");
  }

  if (input.title && input.title.length > 12) {
    score += 10;
    reasons.push("Title present");
  } else {
    reasons.push("Missing/short title");
  }

  if (input.language) {
    score += 5;
  } else {
    reasons.push("Language missing");
  }

  let verdict: ArticleQualityVerdict = "good";
  if (score < 10) {
    verdict = "reject";
  } else if (score < 45) {
    verdict = "needs_review";
  }

  return { score, reasons, verdict };
}

/**
 * Optional model-backed scoring: if QUALITY_MODEL_URL is set, try scoring via an API that returns
 * `{ score: number, reasons?: string[], verdict?: "good" | "needs_review" | "reject" }`.
 * Falls back to heuristic scoring when unavailable or failing.
 */
export async function scoreArticleQualityWithModel(
  input: ClassifierInput,
): Promise<ArticleQualityScore | null> {
  const url = process.env.QUALITY_MODEL_URL;
  if (!url) return null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") return null;
    const score = typeof (payload as { score?: unknown }).score === "number" ? (payload as { score: number }).score : null;
    if (typeof score !== "number") return null;
    const reasonsRaw = (payload as { reasons?: unknown }).reasons;
    const reasons = Array.isArray(reasonsRaw)
      ? reasonsRaw.filter((entry): entry is string => typeof entry === "string")
      : [];
    const verdictRaw = (payload as { verdict?: unknown }).verdict;
    const verdict: ArticleQualityVerdict =
      verdictRaw === "needs_review" || verdictRaw === "reject" ? verdictRaw : "good";
    return { score, reasons, verdict };
  } catch {
    return null;
  }
}
