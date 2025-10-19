import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildDeck } from "@/lib/deck";
import { logger } from "@/lib/logger";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { buildRateLimitKey, getClientIp } from "@/lib/security/request";

export async function GET(request: Request) {
  const key = buildRateLimitKey(request, "deck:get");
  const rate = applyRateLimit(key, 60_000, 45);
  if (!rate.success) {
    return NextResponse.json(
      { message: "Too many deck requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } },
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? undefined;
  const ip = getClientIp(request);

  try {
    const cards = await buildDeck({ userId, ip });
    return NextResponse.json({ cards }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Failed to build deck");
    return NextResponse.json({ message: "Failed to build deck" }, { status: 500 });
  }
}
