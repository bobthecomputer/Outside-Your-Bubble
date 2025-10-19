import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/security/rate-limit";
import { buildRateLimitKey } from "@/lib/security/request";

export async function GET(request: Request) {
  const rate = applyRateLimit(buildRateLimitKey(request, "achievements:get"), 60_000, 30);
  if (!rate.success) {
    return NextResponse.json(
      { achievements: [], message: "Too many achievement requests" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } },
    );
  }

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ achievements: [] }, { status: 200 });
  }

  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });

  return NextResponse.json(
    {
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        code: achievement.code,
        earnedAt: achievement.earnedAt.toISOString(),
        metadata: achievement.metadata,
      })),
    },
    { status: 200 },
  );
}
