import { ItemTier, type Prisma } from "@prisma/client";
import type { NormalizedItem } from "./types";

export const arxivSample: Omit<NormalizedItem, "source"> = {
  url: "https://arxiv.org/abs/2404.12345",
  title: "Adaptive Alignment Strategies for Contextual Bandits",
  author: "Ada Nguyen",
  publishedAt: new Date("2024-04-22T00:00:00Z"),
  language: "en",
  tags: ["contextual bandits", "reinforcement learning"],
  text:
    "We introduce an adaptive alignment strategy for contextual bandit agents balancing exploration, personalization, and verification. Our method calibrates uncertainty estimates with external factuality scores and yields 18% uplift in serendipitous discoveries across offline policy evaluation benchmarks.",
  tier: ItemTier.T1b,
  provenance: {
    tier: "T1b",
    provider: "arXiv",
    note: "Offline sample (network fallback)",
  } satisfies Prisma.JsonValue,
};

export const rssSample: Omit<NormalizedItem, "source"> = {
  url: "https://newsroom.example.com/articles/verified-ai-disclosure",
  title: "EU regulator pilots verified disclosures for AI systems",
  author: "Jordan Ellis",
  publishedAt: new Date("2024-04-18T12:00:00Z"),
  language: "en",
  tags: ["policy", "ai", "disclosure"],
  text:
    "The European Digital Oversight Board launched a pilot requiring large AI providers to attach provenance disclosures and verification badges to high-impact updates. Early participants report faster cross-team audits and clearer public communication.",
  tier: ItemTier.T2,
  provenance: {
    tier: "T2",
    provider: "OYB sample newsroom",
    note: "Offline sample (network fallback)",
  } satisfies Prisma.JsonValue,
};
