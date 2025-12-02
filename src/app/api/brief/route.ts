import { NextResponse } from "next/server";
import { buildMorningBrief } from "@/lib/brief";
import { applyRateLimit, rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { buildRateLimitKey } from "@/lib/security/request";

export async function GET(request: Request) {
  const key = buildRateLimitKey(request, "brief:get");
  const rate = await applyRateLimit(key, 60_000, 20);
  const limited = rateLimitExceededResponse(rate, "Too many brief requests");
  if (limited) {
    return limited;
  }

  const url = new URL(request.url);
  const atParam = url.searchParams.get("at");
  let at: Date | undefined;

  if (atParam) {
    const parsed = new Date(atParam);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ message: "Invalid 'at' parameter" }, { status: 400 });
    }
    at = parsed;
  }

  try {
    const brief = await buildMorningBrief(at ?? new Date());
    return NextResponse.json(brief, { status: 200 });
  } catch (error) {
    console.error("Failed to build Morning Brief", error);
    return NextResponse.json(
      { message: "Failed to build Morning Brief" },
      { status: 500 },
    );
  }
}
