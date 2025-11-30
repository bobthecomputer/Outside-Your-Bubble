import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordSwipe } from "@/lib/deck";
import type { SwipeAction } from "@/types/deck";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { buildRateLimitKey, getClientIp } from "@/lib/security/request";

function isSwipeAction(value: unknown): value is SwipeAction {
  return value === "left" || value === "right" || value === "up" || value === "down";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = applyRateLimit(buildRateLimitKey(request, "deck:swipe"), 60_000, 120);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Too many swipe events" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as { cardId?: unknown; action?: unknown; ms?: unknown };
  const { cardId, action, ms } = payload;

  if (typeof cardId !== "string" || cardId.length === 0) {
    return NextResponse.json({ message: "Missing cardId" }, { status: 400 });
  }

  if (!isSwipeAction(action)) {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const durationMs = typeof ms === "number" && Number.isFinite(ms) ? ms : undefined;
  const session = await auth();
  const userId = session?.user?.id ?? undefined;

  if (userId) {
    const userRate = applyRateLimit(`deck:swipe:user:${userId}`, 60_000, 120);
    if (!userRate.success) {
      return NextResponse.json(
        { message: "Too many swipe events" },
        { status: 429, headers: { "Retry-After": String(userRate.retryAfter ?? 60) } },
      );
    }
  }

  try {
    await recordSwipe({
      userId,
      cardId,
      action,
      durationMs,
      ip,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({ error }, "Failed to record swipe");
    if (error instanceof Error && error.message.includes("Deck card not found")) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Failed to record swipe" }, { status: 500 });
  }
}
