import crypto from "node:crypto";
import { URL } from "node:url";

export function canonicalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.hash = "";
  if (url.searchParams.has("utm_source")) {
    url.searchParams.delete("utm_source");
  }
  if (url.searchParams.has("utm_medium")) {
    url.searchParams.delete("utm_medium");
  }
  if (url.searchParams.has("utm_campaign")) {
    url.searchParams.delete("utm_campaign");
  }
  return url.toString();
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function readingTimeMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const REGION_OVERRIDE: Record<string, string> = {
  "npr.org": "US",
  "feeds.npr.org": "US",
  "bbc.co.uk": "GB",
  "lemonde.fr": "FR",
  "elpais.com": "ES",
  "aljazeera.com": "QA",
  "export.arxiv.org": "GLOBAL",
  "arxiv.org": "GLOBAL",
};

const TLD_REGION: Record<string, string> = {
  uk: "GB",
  fr: "FR",
  de: "DE",
  it: "IT",
  es: "ES",
  br: "BR",
  in: "IN",
  cn: "CN",
  jp: "JP",
  ru: "RU",
  ca: "CA",
  au: "AU",
};

export function inferRegionTag(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (REGION_OVERRIDE[hostname]) {
      return `region:${REGION_OVERRIDE[hostname]}`;
    }

    const domainParts = hostname.split(".");
    const tld = domainParts[domainParts.length - 1];
    if (TLD_REGION[tld]) {
      return `region:${TLD_REGION[tld]}`;
    }

    if (hostname.includes("localhost") || hostname.endsWith(".local")) {
      return null;
    }
  } catch (error) {
    console.warn("inferRegionTag failed", error);
    return null;
  }

  return "region:GLOBAL";
}
