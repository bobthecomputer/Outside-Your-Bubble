import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { runPython } from "@/lib/python";
import { withRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

interface BriefRequest {
  itemId: string;
  persona?: "strategist" | "designer" | "investor";
  categorySlug: string;
  mode?: string;
}

export const POST = withRateLimit(async (request) => {
  const body = (await request.json()) as BriefRequest;
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

  const args = [
    "--topic",
    item.title ?? body.categorySlug,
    "--category",
    body.categorySlug,
    "--persona",
    body.persona ?? "strategist",
  ];
  if (body.mode) {
    args.push("--mode", body.mode);
  }

  const payload = await runPython("professional-brief", {
    args,
    input: item.summaryText || item.contextSummary || item.text || item.title || "",
  });

  return NextResponse.json({ brief: payload });
});
