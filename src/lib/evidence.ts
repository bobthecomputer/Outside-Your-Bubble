import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeSummaryCitations } from "./citations";

export type EvidenceEntry = {
  label: string;
  url?: string;
  detail?: string;
};

export type EvidenceChip = {
  code: "Source" | "Method" | "Contradiction";
  entries: EvidenceEntry[];
};

export type EvidenceDrawer = {
  itemId: string;
  headline?: string | null;
  chips: EvidenceChip[];
};

type JsonValue = Prisma.JsonValue;

type JsonObject = { [key: string]: JsonValue };

type NormalizableEntry =
  | string
  | (JsonObject & {
      label?: JsonValue;
      title?: JsonValue;
      description?: JsonValue;
      summary?: JsonValue;
      detail?: JsonValue;
      url?: JsonValue;
      link?: JsonValue;
    });

function extractLabel(raw: JsonValue | undefined): string | undefined {
  if (typeof raw === "string" && raw.length > 0) return raw;
  return undefined;
}

function extractEntry(value: NormalizableEntry): EvidenceEntry | null {
  if (typeof value === "string") {
    return { label: value };
  }

  const label =
    extractLabel(value.label) ||
    extractLabel(value.title) ||
    extractLabel(value.summary) ||
    extractLabel(value.description) ||
    extractLabel(value.detail);
  const url = extractLabel(value.url) ?? extractLabel(value.link);

  if (!label && !url) return null;

  return {
    label: label ?? url ?? "",
    url: url ?? undefined,
    detail: label && url ? label : undefined,
  };
}

function normalizeEvidenceCollection(raw: JsonValue | undefined): EvidenceEntry[] {
  if (!raw) return [];

  const entries: EvidenceEntry[] = [];

  if (Array.isArray(raw)) {
    for (const value of raw) {
      const entry = extractEntry(value as NormalizableEntry);
      if (entry) {
        entries.push(entry);
      }
    }
    return entries;
  }

  if (typeof raw === "object") {
    const record = raw as JsonObject;
    for (const key of Object.keys(record)) {
      const value = record[key];
      const entry = extractEntry(
        typeof value === "string"
          ? value
          : {
              ...(value as JsonObject),
              label: extractLabel((value as JsonObject).label) ?? key,
            },
      );
      if (entry) {
        if (!entry.label && key) {
          entry.label = key;
        }
        entries.push(entry);
      }
    }
  }

  return entries;
}

export async function buildEvidenceDrawer(itemId: string): Promise<EvidenceDrawer> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      summary: true,
      verification: true,
    },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  const sourceEntries = normalizeSummaryCitations(item.summary?.citations).map((citation) => ({
    label: citation.label,
    url: citation.url,
  }));

  const methodEntries = normalizeEvidenceCollection(item.verification?.evidence);
  const contradictionEntries = normalizeEvidenceCollection(item.verification?.contradictions);

  return {
    itemId,
    headline: item.summary?.headline ?? item.title,
    chips: [
      { code: "Source", entries: sourceEntries.slice(0, 5) },
      { code: "Method", entries: methodEntries.slice(0, 5) },
      { code: "Contradiction", entries: contradictionEntries.slice(0, 5) },
    ],
  };
}
