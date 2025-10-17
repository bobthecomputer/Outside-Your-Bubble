import type { Item, VerificationStatus } from "@prisma/client";

export type UserPreferenceVector = {
  likedTopics: string[];
  serendipity: number;
  nationality?: string | null;
};

export type TopicWeight = {
  topic: string;
  weight: number;
};

export type SlateCandidate = {
  id: string;
  score: number;
  topicScore: number;
  geoScore: number;
  verificationMultiplier: number;
  tags: string[];
  regions: string[];
};

export type SlatePlan = {
  topicDistribution: TopicWeight[];
  candidates: SlateCandidate[];
};

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase();
}

function clampSerendipity(value: number): number {
  if (Number.isNaN(value)) return 0.2;
  return Math.min(1, Math.max(0, value));
}

export function computeTopicDistribution({
  likedTopics,
  candidateTopics,
  serendipity,
}: {
  likedTopics: string[];
  candidateTopics: Iterable<string>;
  serendipity: number;
}): Map<string, number> {
  const normalizedLiked = new Set(likedTopics.map(normalizeTopic));
  const normalizedCandidates = Array.from(candidateTopics, normalizeTopic).filter((topic) => topic.length > 0);
  const baseSerendipity = clampSerendipity(serendipity);
  const weights = new Map<string, number>();
  let total = 0;

  for (const topic of normalizedLiked) {
    weights.set(topic, 1);
    total += 1;
  }

  const residualTopics = normalizedCandidates.filter((topic) => !weights.has(topic));
  const residualWeight = residualTopics.length > 0 ? Math.max(baseSerendipity, 0.1) / residualTopics.length : 0;

  for (const topic of residualTopics) {
    weights.set(topic, residualWeight);
    total += residualWeight;
  }

  if (total === 0) {
    return weights;
  }

  for (const [topic, weight] of weights.entries()) {
    weights.set(topic, weight / total);
  }

  return weights;
}

export function extractRegionsFromTags(tags: string[]): string[] {
  return tags
    .filter((tag) => tag.startsWith("region:"))
    .map((tag) => tag.replace("region:", ""))
    .map((region) => region.toUpperCase());
}

function verificationPenalty(status: VerificationStatus): number {
  switch (status) {
    case "CONTESTED":
      return 0.4;
    case "DEVELOPING":
      return 0.7;
    case "TENTATIVE":
      return 0.85;
    case "CONFIRMED":
    default:
      return 1;
  }
}

function computeTopicScore({ tags, distribution, serendipity }: { tags: string[]; distribution: Map<string, number>; serendipity: number }): number {
  const topicalTags = tags.filter((tag) => !tag.startsWith("region:"));
  if (topicalTags.length === 0) {
    return clampSerendipity(serendipity) * 0.5;
  }

  let score = clampSerendipity(serendipity) * 0.25;
  for (const tag of topicalTags) {
    const normalized = normalizeTopic(tag);
    const weight = distribution.get(normalized);
    if (typeof weight === "number") {
      score = Math.max(score, weight);
    }
  }

  return score;
}

function computeGeodiversityScore({
  userNationality,
  regions,
  serendipity,
}: {
  userNationality?: string | null;
  regions: string[];
  serendipity: number;
}): number {
  if (regions.length === 0) {
    return 0.6 * clampSerendipity(serendipity) + 0.2;
  }

  if (!userNationality) {
    return 0.8;
  }

  const normalizedUser = userNationality.trim().toUpperCase();
  const includesHome = regions.includes(normalizedUser);
  if (includesHome) {
    return 0.45;
  }

  if (regions.includes("GLOBAL")) {
    return 0.7;
  }

  return 1;
}

function explainRegions(regions: string[], userNationality?: string | null): string[] {
  if (!userNationality) {
    return regions.length > 0 ? regions : ["GLOBAL"];
  }
  const normalizedUser = userNationality.trim().toUpperCase();
  if (regions.length === 0) {
    return [normalizedUser, "GLOBAL"];
  }
  if (regions.includes(normalizedUser)) {
    return [normalizedUser, ...regions.filter((region) => region !== normalizedUser)];
  }
  return regions;
}

export function scoreItemForUser({
  item,
  preferenceDistribution,
  nationality,
  serendipity,
}: {
  item: Pick<Item, "id" | "tags" | "status">;
  preferenceDistribution: Map<string, number>;
  nationality?: string | null;
  serendipity: number;
}): SlateCandidate {
  const topicScore = computeTopicScore({ tags: item.tags, distribution: preferenceDistribution, serendipity });
  const regions = extractRegionsFromTags(item.tags);
  const geoScore = computeGeodiversityScore({ userNationality: nationality, regions, serendipity });
  const verificationMultiplier = verificationPenalty(item.status);
  const combined = 0.55 * topicScore + 0.35 * geoScore + 0.1 * verificationMultiplier;

  return {
    id: item.id,
    score: combined * verificationMultiplier,
    topicScore,
    geoScore,
    verificationMultiplier,
    tags: item.tags,
    regions: explainRegions(regions, nationality),
  };
}

export function planSlate({
  items,
  preferences,
}: {
  items: Pick<Item, "id" | "tags" | "status">[];
  preferences: UserPreferenceVector;
}): SlatePlan {
  const candidateTopics = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags) {
      if (!tag.startsWith("region:")) {
        candidateTopics.add(tag);
      }
    }
  }

  const distribution = computeTopicDistribution({
    likedTopics: preferences.likedTopics,
    candidateTopics,
    serendipity: preferences.serendipity,
  });

  const scored = items.map((item) =>
    scoreItemForUser({
      item,
      preferenceDistribution: distribution,
      nationality: preferences.nationality,
      serendipity: preferences.serendipity,
    }),
  );

  scored.sort((a, b) => b.score - a.score);

  const topicDistribution: TopicWeight[] = Array.from(distribution.entries()).map(([topic, weight]) => ({
    topic,
    weight,
  }));

  return {
    topicDistribution,
    candidates: scored,
  };
}
