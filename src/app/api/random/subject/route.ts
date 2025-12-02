import { NextResponse } from "next/server";

import { runPython } from "@/lib/python";
import { withRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async (request) => {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");
  const professionalParam = searchParams.get("professional");
  const args: string[] = [];
  if (group) {
    args.push("--group", group);
  }
  if (professionalParam === "true") {
    args.push("--professional");
  }

  const subject = (await runPython("random-subject", { args })) as Record<string, unknown> | null;
  return NextResponse.json({ subject });
}, { scope: "random:subject", message: "Too many random subject requests" });
