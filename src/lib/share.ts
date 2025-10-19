import type { SharedStory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/events";
import { logger } from "@/lib/logger";
import { defaultPartnerCodes, isBetaPartnerCode } from "@/lib/partners";

const MAX_SUMMARY_LENGTH = 1200;
const MAX_TAGS = 8;

export type ShareSubmission = {
  userId?: string;
  itemId?: string;
  sourceUrl?: string;
  title: string;
  summary?: string;
  noveltyAngle?: string;
  partnerTargets?: string[];
  tags?: string[];
  ip?: string | null;
  contextSummary?: string;
  studyPrompts?: string[];
  channels?: string[];
  originalLanguage?: string | null;
  translationProvider?: string | null;
  metadata?: Record<string, unknown> | null;
};

function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const unique = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) continue;
    unique.add(trimmed.slice(0, 48));
    if (unique.size >= MAX_TAGS) break;
  }
  return Array.from(unique);
}

function pickPartners(requested?: string[], region?: string | null): string[] {
  const safeRequested = (requested ?? []).filter((code) => isBetaPartnerCode(code));
  if (safeRequested.length > 0) {
    return safeRequested.slice(0, 5);
  }
  return defaultPartnerCodes(region).slice(0, 5);
}

function normalizePrompts(prompts?: string[]): string[] {
  if (!Array.isArray(prompts)) return [];
  const unique = new Set<string>();
  for (const prompt of prompts) {
    if (typeof prompt !== "string") continue;
    const trimmed = prompt.trim();
    if (!trimmed) continue;
    unique.add(trimmed.slice(0, 220));
    if (unique.size >= 8) break;
  }
  return Array.from(unique);
}

function normalizeChannels(channels?: string[]): string[] {
  if (!Array.isArray(channels)) return [];
  const unique = new Set<string>();
  for (const channel of channels) {
    if (typeof channel !== "string") continue;
    const trimmed = channel.trim().toLowerCase();
    if (!trimmed) continue;
    unique.add(trimmed.slice(0, 48));
    if (unique.size >= 12) break;
  }
  return Array.from(unique);
}

export async function submitSharedStory(
  input: ShareSubmission & { regionTag?: string | null },
): Promise<{ story: SharedStory; created: boolean }> {
  const {
    userId,
    itemId,
    sourceUrl,
    title,
    summary,
    noveltyAngle,
    partnerTargets,
    tags,
    ip,
    regionTag,
    contextSummary,
    studyPrompts,
    channels,
    originalLanguage,
    translationProvider,
    metadata,
  } = input;
  const trimmedTitle = title.trim().slice(0, 200);
  const trimmedSummary = summary?.trim().slice(0, MAX_SUMMARY_LENGTH);
  const trimmedAngle = noveltyAngle?.trim().slice(0, 200);
  const normalizedTags = normalizeTags(tags);
  const partners = pickPartners(partnerTargets, regionTag);
  const normalizedPrompts = normalizePrompts(studyPrompts);
  const normalizedChannels = normalizeChannels(channels);
  const trimmedContext = contextSummary?.trim().slice(0, 600) ?? null;
  const language = originalLanguage?.trim().slice(0, 16) ?? null;
  const provider = translationProvider?.trim().slice(0, 48) ?? null;
  const metadataJson = metadata ? JSON.parse(JSON.stringify(metadata)) : null;

  if (partners.length === 0) {
    throw new Error("No eligible partner targets for submission");
  }

  let existing: SharedStory | null = null;
  if (sourceUrl) {
    existing = await prisma.sharedStory.findFirst({
      where: {
        sourceUrl,
        userId: userId ?? null,
        status: { in: ["pending", "in_review"] },
      },
    });
  }

  if (existing) {
    return { story: existing, created: false };
  }

  try {
    const story = await prisma.sharedStory.create({
      data: {
        userId,
        itemId,
        sourceUrl,
        title: trimmedTitle,
        summary: trimmedSummary,
        noveltyAngle: trimmedAngle,
        partnerTargets: partners,
        tags: normalizedTags,
        contextSummary: trimmedContext,
        studyPrompts: normalizedPrompts,
        channels: normalizedChannels,
        originalLanguage: language,
        translationProvider: provider,
        metadata: metadataJson,
      },
    });

    await recordEvent({
      userId,
      name: "beta.share.submitted",
      payload: {
        storyId: story.id,
        itemId,
        sourceUrl,
        partnerTargets: partners,
        noveltyAngle: trimmedAngle,
        tags: normalizedTags,
        contextSummary: trimmedContext,
        studyPrompts: normalizedPrompts,
        channels: normalizedChannels,
        originalLanguage: language,
        translationProvider: provider,
      },
      metadata: { ip },
    });

    return { story, created: true };
  } catch (error) {
    logger.error({ error }, "share:submit-failed");
    throw error;
  }
}
