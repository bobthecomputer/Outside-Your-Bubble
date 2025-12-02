import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startOrResumeLearningPath } from "@/lib/learning";
import { logger } from "@/lib/logger";
import { recordEvent } from "@/lib/events";
import { getClientIp, buildRateLimitKey } from "@/lib/security/request";
import { applyRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const rateKey = buildRateLimitKey(request, "learning:path");
  const rate = await applyRateLimit(rateKey, 60_000, 30);
  const limited = rateLimitExceededResponse(rate, "Too many learning path requests");
  if (limited) {
    return limited;
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const topicId = typeof (body as { topicId?: unknown }).topicId === "string" ? (body as { topicId: string }).topicId : undefined;

  try {
    const path = await startOrResumeLearningPath(userId, topicId);
    try {
      await recordEvent({
        userId,
        name: "learning.path.start",
        payload: {
          topicId: topicId ?? null,
          pathId: path.id,
        },
        metadata: { ip: getClientIp(request) },
      });
    } catch (eventError) {
      logger.warn({ eventError }, "Failed to log learning path start");
    }
    return NextResponse.json(path, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Failed to start learning path");
    return NextResponse.json({ message: "Failed to start learning path" }, { status: 500 });
  }
}
