import { franc } from "franc";
import { logger } from "@/lib/logger";
import { runPython } from "@/lib/python";

const ISO3_TO_ISO1: Record<string, string> = {
  afr: "af",
  amh: "am",
  ara: "ar",
  bel: "be",
  ben: "bn",
  bul: "bg",
  cat: "ca",
  ces: "cs",
  cmn: "zh",
  dan: "da",
  deu: "de",
  ell: "el",
  eng: "en",
  est: "et",
  fas: "fa",
  fin: "fi",
  fra: "fr",
  gle: "ga",
  glg: "gl",
  heb: "he",
  hin: "hi",
  hrv: "hr",
  hun: "hu",
  ind: "id",
  isl: "is",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  lit: "lt",
  lvs: "lv",
  msa: "ms",
  nld: "nl",
  nor: "no",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  slk: "sk",
  slv: "sl",
  spa: "es",
  srp: "sr",
  swe: "sv",
  tam: "ta",
  tel: "te",
  tha: "th",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  vie: "vi",
  zho: "zh",
};

const LANGUAGE_ALIASES: Record<string, string> = {
  "pt-br": "pt",
  "pt-pt": "pt",
  "en-us": "en",
  "en-gb": "en",
  "zh-cn": "zh",
  "zh-tw": "zh",
  "zh-hans": "zh",
  "zh-hant": "zh",
};

const TRANSLATION_ENABLED = process.env.INGEST_TRANSLATE === "true";
const MAX_TOTAL_CHARS = Number.parseInt(process.env.INGEST_TRANSLATE_MAX_TOTAL ?? "20000", 10);
const CHUNK_CHAR_LIMIT = Number.parseInt(process.env.INGEST_TRANSLATE_CHUNK ?? "3500", 10);

function chunkText(input: string, limit: number): string[] {
  const sanitized = input.replace(/\s+/g, " ").trim();
  if (sanitized.length <= limit) {
    return sanitized.length > 0 ? [sanitized] : [];
  }

  const sentences = sanitized.match(/[^.!?\n]+[.!?\n]*/g) ?? [sanitized];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const addition = sentence.trim();
    if (!addition) continue;
    if ((current + " " + addition).trim().length > limit) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      if (addition.length > limit) {
        const parts = addition.match(new RegExp(`.{1,${limit}}`, "g"));
        if (parts) {
          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.length > 0) {
              chunks.push(trimmed);
            }
          }
        }
        continue;
      }
      current = addition;
    } else {
      current = current ? `${current} ${addition}` : addition;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

export function normalizeLanguageCode(input?: string | null): string | null {
  if (!input) return null;
  const lowered = input.toLowerCase().trim();
  if (!lowered) return null;
  if (LANGUAGE_ALIASES[lowered]) {
    return LANGUAGE_ALIASES[lowered];
  }
  if (lowered.length === 2) {
    return lowered;
  }
  if (ISO3_TO_ISO1[lowered]) {
    return ISO3_TO_ISO1[lowered];
  }
  return null;
}

export function detectLanguage(text: string, hint?: string | null): {
  code: string | null;
  method: "hint" | "franc" | "unknown";
} {
  const normalizedHint = normalizeLanguageCode(hint);
  if (normalizedHint) {
    return { code: normalizedHint, method: "hint" };
  }

  const sample = text.replace(/\s+/g, " ").slice(0, 4096);
  if (sample.length < 24) {
    return { code: normalizedHint ?? null, method: "unknown" };
  }

  try {
    const result = franc(sample, { minLength: 24 });
    if (!result || result === "und") {
      return { code: normalizedHint ?? null, method: "unknown" };
    }
    const normalized = normalizeLanguageCode(result);
    return { code: normalized ?? normalizedHint ?? null, method: normalized ? "franc" : "unknown" };
  } catch (error) {
    logger.debug({ error }, "ingest:language-detect-error");
    return { code: normalizedHint ?? null, method: "unknown" };
  }
}

export async function maybeTranslateToEnglish(text: string, from?: string | null): Promise<
  | {
      translatedText: string;
      detectedLanguage: string | null;
      provider: string;
      truncated: boolean;
    }
  | null
> {
  if (!TRANSLATION_ENABLED) {
    return null;
  }

  const normalizedFrom = normalizeLanguageCode(from) ?? undefined;
  const trimmed = MAX_TOTAL_CHARS > 0 ? text.slice(0, MAX_TOTAL_CHARS) : text;
  const chunks = chunkText(trimmed, Math.max(500, CHUNK_CHAR_LIMIT));
  if (chunks.length === 0) {
    return null;
  }

  const pieces: string[] = [];
  let detected: string | null = normalizeLanguageCode(from) ?? null;

  try {
    const args = ["--target-lang", "en"];
    if (normalizedFrom) {
      args.push("--source-lang", normalizedFrom);
    }
    const payload = (await runPython("translate", {
      args,
      input: chunks.join("\n\n"),
    })) as
      | {
          text?: string;
          provider?: string;
          detected?: string | null;
          note?: string;
        }
      | null;
    if (!payload || typeof payload.text !== "string") {
      return null;
    }
    detected = normalizeLanguageCode(payload.detected ?? undefined) ?? detected;
    pieces.push(payload.text);
    return {
      translatedText: pieces.join("\n\n"),
      detectedLanguage: detected,
      provider: payload.provider ?? "oyb-local",
      truncated: trimmed.length < text.length,
    };
  } catch (error) {
    logger.warn({ error }, "ingest:translation-failed");
    return null;
  }
}
