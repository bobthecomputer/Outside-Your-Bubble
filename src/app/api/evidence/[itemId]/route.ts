import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildEvidenceDrawer } from "@/lib/evidence";
import { logger } from "@/lib/logger";
import { awardAchievement } from "@/lib/achievements";
import { recordEvent } from "@/lib/events";
import { getClientIp, buildRateLimitKey } from "@/lib/security/request";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: { itemId: string } }) {
  const { itemId } = context.params;
  const rateKey = buildRateLimitKey(request, "evidence:get");
  const rate = applyRateLimit(rateKey, 60_000, 40);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Too many evidence requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } },
    );
  }

  const session = await auth();

  if (!itemId || typeof itemId !== "string") {
    return NextResponse.json({ message: "Missing itemId" }, { status: 400 });
  }

  try {
    const drawer = await buildEvidenceDrawer(itemId);

    if (session?.user?.id) {
      try {
        await recordEvent({
          userId: session.user.id,
          name: "evidence.open",
          payload: { itemId },
          metadata: { ip: getClientIp(request) },
        });

        const count = await prisma.event.count({
          where: {
            userId: session.user.id,
            name: "evidence.open",
          },
        });

        if (count >= 10) {
          await awardAchievement(session.user.id, "mirror_thinker", { opens: count });
        }
      } catch (eventError) {
        logger.warn({ eventError }, "Failed to log evidence open event");
      }
    }

    return NextResponse.json(drawer, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "Item not found") {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }
    logger.error({ error }, "Failed to build evidence drawer");
    return NextResponse.json({ message: "Failed to load evidence" }, { status: 500 });
  }
}
