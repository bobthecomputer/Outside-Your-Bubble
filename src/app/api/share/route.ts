import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { submitSharedStory } from "@/lib/share";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { buildRateLimitKey, getClientIp } from "@/lib/security/request";
import { logger } from "@/lib/logger";

const SHARE_ENABLED = process.env.BETA_SHARE_ENABLED === "true";

const shareSchema = z
  .object({
    itemId: z.string().min(1).optional(),
    url: z.string().url().optional(),
    title: z.string().min(6).max(200),
    summary: z.string().min(0).max(1200).optional(),
    noveltyAngle: z.string().min(0).max(200).optional(),
    partnerTargets: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    contextSummary: z.string().max(600).optional(),
    studyPrompts: z.array(z.string().min(2).max(160)).max(8).optional(),
    channels: z.array(z.string()).max(12).optional(),
    originalLanguage: z.string().max(16).optional(),
    translationProvider: z.string().max(48).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((value) => Boolean(value.itemId || value.url), {
    message: "Provide an itemId or url",
    path: ["itemId"],
  });

export async function POST(request: Request) {
  if (!SHARE_ENABLED) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const rate = applyRateLimit(buildRateLimitKey(request, "share:submit"), 60 * 60 * 1000, 10);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Too many submissions" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 3600) } },
    );
  }

  let payload: z.infer<typeof shareSchema>;
  try {
    const body = await request.json();
    payload = shareSchema.parse(body);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors[0]?.message ?? "Invalid request" : "Invalid request";
    return NextResponse.json({ message }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    const anonRate = applyRateLimit(buildRateLimitKey(request, "share:anon"), 60 * 60 * 1000, 3);
    if (!anonRate.success) {
      return NextResponse.json(
        { message: "Login required for additional submissions" },
        { status: 429, headers: { "Retry-After": String(anonRate.retryAfter ?? 3600) } },
      );
    }
  }

  let regionTag: string | null = null;
  try {
    if (payload.itemId) {
      const item = await prisma.item.findUnique({
        where: { id: payload.itemId },
        select: { tags: true },
      });
      if (!item) {
        return NextResponse.json({ message: "Item not found" }, { status: 404 });
      }
      regionTag = item.tags.find((tag) => typeof tag === "string" && tag.startsWith("region:")) ?? null;
    } else if (payload.tags?.length) {
      regionTag = payload.tags.find((tag) => typeof tag === "string" && tag.startsWith("region:")) ?? null;
    }
  } catch (error) {
    logger.error({ error }, "share:lookup-failed");
    return NextResponse.json({ message: "Unable to process submission" }, { status: 500 });
  }

  try {
    const result = await submitSharedStory({
      userId: userId ?? undefined,
      itemId: payload.itemId,
      sourceUrl: payload.url,
      title: payload.title,
      summary: payload.summary,
      noveltyAngle: payload.noveltyAngle,
      partnerTargets: payload.partnerTargets,
      tags: payload.tags,
      contextSummary: payload.contextSummary,
      studyPrompts: payload.studyPrompts,
      channels: payload.channels,
      originalLanguage: payload.originalLanguage,
      translationProvider: payload.translationProvider,
      metadata: payload.metadata,
      ip,
      regionTag,
    });

    const statusCode = result.created ? 201 : 200;
    return NextResponse.json(
      {
        storyId: result.story.id,
        status: result.story.status,
        partnerTargets: result.story.partnerTargets,
        created: result.created,
      },
      { status: statusCode },
    );
  } catch (error) {
    logger.error({ error }, "share:submit-error");
    return NextResponse.json({ message: "Failed to submit story" }, { status: 500 });
  }
}
