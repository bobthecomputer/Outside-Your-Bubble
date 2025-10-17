import type { Lens, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LensPayload = {
  summary: string;
  bullets: string[];
  references?: Array<{ label: string; url: string }>;
};

async function upsertLens(itemId: string, lensType: Lens["lensType"], payload: LensPayload) {
  return prisma.lens.upsert({
    where: {
      itemId_lensType: {
        itemId,
        lensType,
      },
    },
    create: {
      itemId,
      lensType,
      payload: payload as Prisma.JsonValue,
    },
    update: {
      payload: payload as Prisma.JsonValue,
    },
  });
}

export async function applyDomainLens(itemId: string, tags: string[] = []) {
  const payload: LensPayload = {
    summary: "Key domain context to help interpret this item.",
    bullets: tags.slice(0, 5).map((tag) => `Define ${tag}`),
  };
  return upsertLens(itemId, "domain", payload);
}

export async function applyMathLens(itemId: string) {
  const payload: LensPayload = {
    summary: "Math lens placeholder",
    bullets: ["Explain any formulas or quantitative claims."],
  };
  return upsertLens(itemId, "math", payload);
}

export async function applyLawLens(itemId: string) {
  const payload: LensPayload = {
    summary: "Legal context placeholder",
    bullets: ["Outline relevant statutes or regulations mentioned."],
  };
  return upsertLens(itemId, "law", payload);
}
