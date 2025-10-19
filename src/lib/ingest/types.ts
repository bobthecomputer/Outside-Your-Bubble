import type { ItemTier, Prisma, Source } from "@prisma/client";

export type NormalizedItem = {
  source: Pick<Source, "id" | "type" | "url">;
  url: string;
  title: string;
  author?: string;
  publishedAt?: Date;
  language?: string;
  tags: string[];
  text: string;
  originalText?: string;
  tier: ItemTier;
  provenance: Prisma.JsonValue;
  keywords?: string[];
  translationProvider?: string;
  contextSummary?: string;
  contextBullets?: string[];
  studyPrompts?: string[];
  channels?: string[];
  excerpt?: string;
  contextMetadata?: Prisma.JsonValue;
};

export type IngestResult = {
  created: number;
  updated: number;
  skipped: number;
  itemIds: string[];
};
