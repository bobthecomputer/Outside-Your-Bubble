import { z } from "zod";
import { VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  describeSchema,
  generateJsonWithOllama,
} from "@/lib/models/community";

const claimSchema = z.array(z.string()).max(6);

type Evidence = {
  claim: string;
  source: string;
  url: string;
  quote: string;
  stance: "supports" | "contradicts" | "neutral";
  tier: string;
};

async function extractClaims(text: string, title: string): Promise<string[]> {
  const prompt =
    "Extract up to six concise factual claims from the article below." +
    "\nReturn a JSON array of strings where each element is one verifiable claim." +
    "\nIf you are unsure, return an empty array." +
    "\nTitle: " +
    title +
    "\nBody: " +
    text;

  const schemaHint = describeSchema(["claim one", "claim two"]);

  const rawClaims = await generateJsonWithOllama<string[]>({
    prompt,
    schemaDescription: schemaHint,
  });

  if (!rawClaims?.length) {
    const fallback = [title].filter(Boolean);
    return fallback.length ? fallback : [];
  }

  try {
    return claimSchema.parse(rawClaims);
  } catch (error) {
    logger.warn({ error }, "verification:claim-parse-failed");
    const fallback = [title].filter(Boolean);
    return fallback.length ? fallback : [];
  }
}

async function searchSerper(query: string) {
  if (!process.env.SERPER_API_KEY) return null;
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.SERPER_API_KEY,
    },
    body: JSON.stringify({ q: query, num: 5, hl: "en" }),
  });
  if (!response.ok) {
    logger.warn({ status: response.status }, "verification:serper-error");
    return null;
  }
  return response.json();
}

function tierFromUrl(url: string): string {
  if (url.includes(".gov") || url.includes(".edu")) return "T0";
  if (url.includes("nature.com") || url.includes("sciencedirect")) return "T1";
  return "T2";
}

async function gatherEvidence(claims: string[], itemUrl: string): Promise<Evidence[]> {
  const evidence: Evidence[] = [];
  for (const claim of claims) {
    const search = await searchSerper(claim);
    if (search?.organic?.length) {
      for (const result of search.organic.slice(0, 2)) {
        evidence.push({
          claim,
          source: result.title,
          url: result.link,
          quote: result.snippet ?? "",
          stance: "supports",
          tier: tierFromUrl(result.link),
        });
      }
    } else {
      evidence.push({
        claim,
        source: "Original source",
        url: itemUrl,
        quote: "Independent corroboration not found",
        stance: "neutral",
        tier: "T3",
      });
    }
  }
  return evidence;
}

function computeStatus(evidence: Evidence[], itemTier: string): { status: VerificationStatus; score: number; contradictions: Evidence[] } {
  const supports = evidence.filter((e) => e.stance === "supports");
  const contradictions = evidence.filter((e) => e.stance === "contradicts");
  const base = supports.length / Math.max(1, evidence.length);
  const tierBoost = itemTier === "T0" || itemTier === "T1" ? 0.4 : itemTier === "T1b" ? 0.2 : 0;
  const score = Math.min(1, base + tierBoost);
  let status = VerificationStatus.DEVELOPING;
  if (contradictions.length > 0 && contradictions.some((c) => c.tier === "T1" || c.tier === "T0")) {
    status = VerificationStatus.CONTESTED;
  } else if (supports.length >= 2 && score > 0.6) {
    status = VerificationStatus.CONFIRMED;
  } else if (supports.length >= 1) {
    status = VerificationStatus.TENTATIVE;
  }
  return { status, score, contradictions };
}

export async function verifyItem(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { summary: true, verification: true },
  });
  if (!item?.text) {
    throw new Error(`Item ${itemId} missing text`);
  }

  const summaryClaims = Array.isArray(item.summary?.claims)
    ? (item.summary?.claims as Array<{ statement?: string }>).map((c) => c.statement).filter(Boolean)
    : [];
  const claims = summaryClaims.length
    ? summaryClaims
    : await extractClaims(item.text, item.title ?? "");

  const evidence = await gatherEvidence(claims, item.url);
  const { status, score, contradictions } = computeStatus(evidence, item.tier);

  const verification = await prisma.verification.upsert({
    where: { itemId },
    create: {
      itemId,
      claims,
      evidence,
      corroborationScore: score,
      contradictions,
      status,
    },
    update: {
      claims,
      evidence,
      corroborationScore: score,
      contradictions,
      status,
    },
  });

  await prisma.item.update({
    where: { id: itemId },
    data: {
      status,
    },
  });

  return verification;
}
