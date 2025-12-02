import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { runPython } from "@/lib/python";
import { withRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

interface SuggestRequest {
  itemId: string;
  studyTopic: string;
  categorySlug: string;
  mode?: string;
}

export const POST = withRateLimit(async (request) => {
  const body = (await request.json()) as SuggestRequest;
  const item = await prisma.item.findUnique({
    where: { id: body.itemId },
    select: {
      summaryText: true,
      contextSummary: true,
      text: true,
      title: true,
    },
  });
  if (!item) {
    return NextResponse.json({ error: "item_not_found" }, { status: 404 });
  }

  const args = ["--topic", body.studyTopic, "--category", body.categorySlug];
  if (body.mode) {
    args.push("--mode", body.mode);
  }
  const fallbackText =
    item.summaryText || item.contextSummary || item.text || item.title || "";
  const payload = await runPython("study-suggest", {
    args,
    input: fallbackText,
  });

  return NextResponse.json({ suggestion: payload });
}, { scope: "study:suggest", message: "Too many study suggestions" });
