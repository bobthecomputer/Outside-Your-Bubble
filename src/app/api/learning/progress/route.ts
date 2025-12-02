import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateLearningProgress } from "@/lib/learning";
import { logger } from "@/lib/logger";
import { recordEvent } from "@/lib/events";
import { getClientIp, buildRateLimitKey } from "@/lib/security/request";
import { applyRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";

type StepStatus = "seen" | "done" | "skipped";

function isStepStatus(value: unknown): value is StepStatus {
  return value === "seen" || value === "done" || value === "skipped";
}

export async function POST(request: Request) {
  const rateKey = buildRateLimitKey(request, "learning:progress");
  const rate = await applyRateLimit(rateKey, 60_000, 60);
  const limited = rateLimitExceededResponse(rate, "Too many progress updates");
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
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { stepId?: unknown; status?: unknown };
  const { stepId, status } = payload;

  if (typeof stepId !== "string" || stepId.length === 0) {
    return NextResponse.json({ message: "Missing stepId" }, { status: 400 });
  }

  if (!isStepStatus(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  try {
    const path = await updateLearningProgress(userId, stepId, status);
    try {
      await recordEvent({
        userId,
        name: "learning.step.update",
        payload: {
          pathId: path.id,
          stepId,
          status,
        },
        metadata: { ip: getClientIp(request) },
      });
    } catch (eventError) {
      logger.warn({ eventError }, "Failed to log learning step update");
    }
    return NextResponse.json(path, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Failed to update learning progress");
    if (error instanceof Error && error.message === "Learning path not found") {
      return NextResponse.json({ message: "Learning path not found" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "Step not found") {
      return NextResponse.json({ message: "Step not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Failed to update progress" }, { status: 500 });
  }
}
