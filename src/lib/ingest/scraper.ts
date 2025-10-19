import { extract } from "@extractus/article-extractor";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { NormalizedItem } from "./types";
import { detectLanguage, maybeTranslateToEnglish, normalizeLanguageCode } from "./language";
import { extractKeywords } from "./novelty";
import { canonicalizeUrl, inferRegionTag } from "./utils";
import { logger } from "@/lib/logger";

const USER_AGENT =
  process.env.INGEST_USER_AGENT ?? "OutsideYourBubbleBot/0.1 (+https://outsideyourbubble.example)";

export type ScrapeChannels =
  | "rss"
  | "article-extractor"
  | "readability"
  | "html-meta"
  | "json-ld"
  | "oembed"
  | "amphtml"
  | "microformats"
  | "alternate-feed"
  | "fallback";

type StructuredMetadata = {
  title?: string;
  excerpt?: string;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  authors?: string[];
  siteName?: string;
  ampUrl?: string;
  alternateFeeds?: string[];
  oEmbed?: {
    title?: string;
    author?: string;
    provider?: string;
    description?: string;
    url?: string;
  };
};

type ScrapeResult = {
  url: string;
  title: string;
  text: string;
  excerpt?: string;
  language?: string;
  originalText?: string;
  translationProvider?: string;
  tags: string[];
  keywords: string[];
  contextSummary?: string;
  contextBullets?: string[];
  studyPrompts?: string[];
  channels: ScrapeChannels[];
  structuredMetadata: StructuredMetadata;
};

function ensureSentenceArray(text: string, limit = 3): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractJsonLd(doc: Document, channels: ScrapeChannels[]): StructuredMetadata {
  try {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of scripts) {
      const raw = script.textContent;
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const data = Array.isArray(parsed) ? parsed.find((entry) => entry['@type'] === 'NewsArticle' || entry['@type'] === 'Article') ?? parsed[0] : parsed;
        if (data && typeof data === 'object') {
          const node = data as Record<string, unknown>;
          const authors = Array.isArray(node.author)
            ? (node.author as Array<{ name?: string }>).map((author) => author?.name).filter((name): name is string => Boolean(name))
            : typeof node.author === 'object' && node.author && 'name' in (node.author as object)
              ? [((node.author as { name?: string }).name ?? '').trim()].filter(Boolean)
              : [];
          const tags = Array.isArray(node.keywords)
            ? (node.keywords as string[])
            : typeof node.keywords === 'string'
              ? node.keywords.split(',').map((entry) => entry.trim()).filter(Boolean)
              : [];

          channels.push("json-ld");
          return {
            title: typeof node.headline === 'string' ? node.headline : undefined,
            excerpt: typeof node.description === 'string' ? node.description : undefined,
            image:
              typeof node.image === 'string'
                ? node.image
                : Array.isArray(node.image)
                  ? (node.image as string[])[0]
                  : typeof node.image === 'object' && node.image && 'url' in (node.image as object)
                    ? String((node.image as { url?: unknown }).url ?? '')
                    : undefined,
            publishedTime:
              typeof node.datePublished === 'string'
                ? node.datePublished
                : typeof node.datePublished === 'object' && node.datePublished && '@value' in (node.datePublished as object)
                  ? String((node.datePublished as { ['@value']?: unknown })['@value'] ?? '')
                  : undefined,
            modifiedTime: typeof node.dateModified === 'string' ? node.dateModified : undefined,
            section: typeof node.articleSection === 'string' ? node.articleSection : undefined,
            tags,
            authors,
            siteName: typeof node.publisher === 'object' && node.publisher && 'name' in (node.publisher as object)
              ? String((node.publisher as { name?: unknown }).name ?? '')
              : undefined,
          } satisfies StructuredMetadata;
        }
      } catch (error) {
        logger.debug({ error }, 'ingest:scraper-jsonld-parse-error');
      }
    }
  } catch (error) {
    logger.debug({ error }, 'ingest:scraper-jsonld-error');
  }

  return {};
}

function extractMeta(doc: Document, channels: ScrapeChannels[]): StructuredMetadata {
  const meta = (name: string) => doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? undefined;
  const property = (name: string) => doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ?? undefined;

  const tags = meta('keywords')
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  channels.push("html-meta");
  return {
    title: property('og:title') ?? meta('twitter:title') ?? meta('title'),
    excerpt: property('og:description') ?? meta('description') ?? meta('twitter:description'),
    image: property('og:image') ?? meta('twitter:image'),
    publishedTime: property('article:published_time') ?? meta('article:published_time'),
    modifiedTime: property('article:modified_time') ?? meta('article:modified_time'),
    section: property('article:section') ?? meta('section'),
    tags: tags ?? [],
    authors: [meta('author'), property('article:author'), meta('twitter:creator')].filter((value): value is string => Boolean(value)),
    siteName: property('og:site_name') ?? meta('application-name') ?? undefined,
  };
}

function extractAlternateFeeds(doc: Document, channels: ScrapeChannels[]): string[] {
  const feeds = Array.from(
    doc.querySelectorAll('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]'),
  )
    .map((link) => link.getAttribute('href'))
    .filter((href): href is string => typeof href === 'string' && href.trim().length > 0);
  if (feeds.length > 0) {
    channels.push("alternate-feed");
  }
  return feeds;
}

async function fetchOEmbed(doc: Document, baseUrl: string, channels: ScrapeChannels[]): Promise<StructuredMetadata['oEmbed']> {
  const link = doc.querySelector('link[type="application/json+oembed"], link[type="text/json"], link[type="application/xml+oembed"]');
  const href = link?.getAttribute('href');
  if (!href) {
    return undefined;
  }
  try {
    const resolved = new URL(href, baseUrl).toString();
    const response = await fetch(resolved, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json, */*' },
    });
    if (!response.ok) {
      return undefined;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('json')) {
      const data = (await response.json()) as Record<string, unknown>;
      channels.push("oembed");
      return {
        title: typeof data.title === 'string' ? data.title : undefined,
        author: typeof data.author_name === 'string' ? data.author_name : undefined,
        provider: typeof data.provider_name === 'string' ? data.provider_name : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        url: typeof data.url === 'string' ? data.url : undefined,
      };
    }
  } catch (error) {
    logger.debug({ error, url: baseUrl }, 'ingest:scraper-oembed-error');
  }
  return undefined;
}

function extractMicroformats(doc: Document, channels: ScrapeChannels[]): {
  tags: string[];
  summary?: string;
  authors: string[];
} {
  const entries = Array.from(doc.querySelectorAll('.h-entry, .hnews, [itemtype="http://schema.org/NewsArticle"]'));
  if (entries.length === 0) {
    return { tags: [], authors: [] };
  }
  channels.push("microformats");
  const tags = new Set<string>();
  const authors = new Set<string>();
  let summary: string | undefined;
  for (const entry of entries) {
    const categories = Array.from(entry.querySelectorAll('.p-category, [itemprop="keywords"]'))
      .map((node) => node.textContent?.trim())
      .filter((value): value is string => Boolean(value));
    for (const tag of categories) {
      tags.add(tag);
    }
    const authorNodes = Array.from(entry.querySelectorAll('.p-author, [itemprop="author"] [itemprop="name"], [itemprop="author"]'));
    for (const node of authorNodes) {
      const value = node.textContent?.trim();
      if (value) {
        authors.add(value);
      }
    }
    if (!summary) {
      const candidate =
        entry.querySelector('.p-summary, [itemprop="description"], [itemprop="abstract"]')?.textContent?.trim() ??
        entry.querySelector('.e-content')?.textContent?.trim();
      if (candidate && candidate.length > 40) {
        summary = candidate;
      }
    }
  }
  return { tags: Array.from(tags), summary, authors: Array.from(authors) };
}

async function resolveAmpHtml(
  doc: Document,
  baseUrl: string,
  channels: ScrapeChannels[],
): Promise<{ html: string; url: string } | null> {
  const ampLink = doc.querySelector('link[rel="amphtml"]');
  const href = ampLink?.getAttribute('href');
  if (!href) {
    return null;
  }
  try {
    const resolved = new URL(href, baseUrl).toString();
    const response = await fetch(resolved, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      return null;
    }
    channels.push("amphtml");
    const html = await response.text();
    return { html, url: resolved };
  } catch (error) {
    logger.debug({ error, url: baseUrl }, 'ingest:scraper-amp-error');
    return null;
  }
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch html ${url}: ${response.status}`);
  }
  return response.text();
}

function mergeMetadata(primary: StructuredMetadata, fallback: StructuredMetadata): StructuredMetadata {
  const tags = new Set<string>();
  for (const value of primary.tags ?? []) tags.add(value);
  for (const value of fallback.tags ?? []) tags.add(value);
  return {
    title: primary.title ?? fallback.title,
    excerpt: primary.excerpt ?? fallback.excerpt,
    image: primary.image ?? fallback.image,
    publishedTime: primary.publishedTime ?? fallback.publishedTime,
    modifiedTime: primary.modifiedTime ?? fallback.modifiedTime,
    section: primary.section ?? fallback.section,
    tags: Array.from(tags).filter(Boolean),
    authors: primary.authors?.length ? primary.authors : fallback.authors ?? [],
    siteName: primary.siteName ?? fallback.siteName,
    ampUrl: primary.ampUrl ?? fallback.ampUrl,
    alternateFeeds: primary.alternateFeeds?.length ? primary.alternateFeeds : fallback.alternateFeeds ?? [],
    oEmbed: primary.oEmbed ?? fallback.oEmbed,
  };
}

function buildContextSummary(text: string, metadata: StructuredMetadata): { summary?: string; bullets: string[] } {
  const sentences = ensureSentenceArray(text, 4);
  const bullets = sentences.slice(0, 3);
  let summary: string | undefined;
  if (metadata.excerpt && metadata.excerpt.length > 80) {
    summary = metadata.excerpt;
  } else if (sentences.length > 0) {
    summary = sentences[0];
  }
  return { summary, bullets };
}

function buildStudyPrompts(keywords: string[], metadata: StructuredMetadata): string[] {
  const trimmed = keywords.slice(0, 5);
  const prompts = new Set<string>();
  if (metadata.section) {
    prompts.add(`How does this story fit within the ${metadata.section} beat?`);
  }
  if (metadata.authors?.length) {
    prompts.add(`What previous reporting from ${metadata.authors[0]} contextualizes this update?`);
  }
  if (trimmed.length >= 2) {
    prompts.add(`Compare the roles of ${trimmed[0]} and ${trimmed[1]} in this development.`);
  }
  if (trimmed.length >= 3) {
    prompts.add(`List potential impacts of ${trimmed[2]} mentioned or implied in the article.`);
  }
  prompts.add('Summarize the evidence presented and note any gaps you would investigate next.');
  if (metadata.oEmbed?.provider) {
    prompts.add(`Compare this outlet's framing with coverage from ${metadata.oEmbed.provider}.`);
  }
  if (metadata.alternateFeeds && metadata.alternateFeeds.length > 0) {
    prompts.add('Follow the alternate feeds linked in the article and outline how they expand the context.');
  }
  return Array.from(prompts);
}

export async function scrapeArticle(
  url: string,
  options: { languageHint?: string | null; via?: ScrapeChannels } = {},
): Promise<ScrapeResult | null> {
  const canonicalUrl = canonicalizeUrl(url);
  const channels: ScrapeChannels[] = [];
  let html: string | null = null;

  const addChannel = (channel: ScrapeChannels) => {
    if (!channels.includes(channel)) {
      channels.push(channel);
    }
  };

  const content = await extract(canonicalUrl).catch((error) => {
    logger.debug({ error, url: canonicalUrl }, 'ingest:scraper-extract-error');
    return null;
  });

  let title = content?.title?.trim();
  let text = content?.content?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  let excerpt = content?.excerpt?.trim();

  if (text) {
    addChannel('article-extractor');
  }

  if (!text || text.length < 240) {
    try {
      html = await fetchHtml(canonicalUrl);
    } catch (error) {
      logger.debug({ error, url: canonicalUrl }, 'ingest:scraper-html-fetch-error');
    }
    if (html) {
      const dom = new JSDOM(html, { url: canonicalUrl });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      if (article?.textContent && article.textContent.trim().length > 0) {
        text = article.textContent.replace(/\s+/g, ' ').trim();
        title = title ?? article.title ?? undefined;
        excerpt = excerpt ?? article.excerpt ?? undefined;
        addChannel('readability');
      }
      const metadataChannels: ScrapeChannels[] = [];
      const meta = extractMeta(dom.window.document, metadataChannels);
      const jsonld = extractJsonLd(dom.window.document, metadataChannels);
      const alternateFeeds = extractAlternateFeeds(dom.window.document, metadataChannels);
      const microformats = extractMicroformats(dom.window.document, metadataChannels);
      const oEmbed = await fetchOEmbed(dom.window.document, canonicalUrl, metadataChannels);
      const ampHtml = await resolveAmpHtml(dom.window.document, canonicalUrl, metadataChannels);
      if (ampHtml && (!text || text.length < 240)) {
        try {
          const ampDom = new JSDOM(ampHtml.html, { url: ampHtml.url });
          const ampReader = new Readability(ampDom.window.document);
          const ampArticle = ampReader.parse();
          if (ampArticle?.textContent && ampArticle.textContent.trim().length > 200) {
            text = ampArticle.textContent.replace(/\s+/g, ' ').trim();
            addChannel('amphtml');
          }
        } catch (error) {
          logger.debug({ error, url: canonicalUrl }, 'ingest:scraper-amp-parse-error');
        }
      }
      const merged = mergeMetadata(
        {
          ...jsonld,
          alternateFeeds,
          ampUrl: ampHtml?.url ?? jsonld.ampUrl,
          oEmbed,
          authors: jsonld.authors?.length ? jsonld.authors : microformats.authors,
          tags: [...(jsonld.tags ?? []), ...microformats.tags],
          excerpt: jsonld.excerpt ?? microformats.summary ?? meta.excerpt,
        },
        meta,
      );
      metadataChannels.forEach(addChannel);
      title = title ?? merged.title;
      excerpt = excerpt ?? merged.excerpt;
      const metadataTags = merged.tags ?? [];
      const regionTag = inferRegionTag(canonicalUrl);
      const docTags = metadataTags.filter(Boolean);
      const combinedTags = new Set<string>(docTags);
      if (regionTag) combinedTags.add(regionTag);
      const metadata: StructuredMetadata = {
        ...merged,
        tags: Array.from(combinedTags),
        alternateFeeds,
        ampUrl: merged.ampUrl,
        oEmbed,
      };
      const { summary, bullets } = text ? buildContextSummary(text, metadata) : { summary: undefined, bullets: [] };
      const keywords = text ? extractKeywords(text, 30) : [];

      const studyPrompts = keywords.length ? buildStudyPrompts(keywords, metadata) : [];

      if (!text || text.length < 240) {
        logger.debug({ url: canonicalUrl }, 'ingest:scraper-insufficient-text');
        return null;
      }

      const languageDetection = detectLanguage(text, options.languageHint ?? metadata.siteName);
      let language = languageDetection.code ?? normalizeLanguageCode(options.languageHint) ?? 'en';
      let workingText = text;
      let originalText: string | undefined;
      let translationProvider: string | undefined;

      if (language !== 'en') {
        const translation = await maybeTranslateToEnglish(workingText, language);
        if (translation?.translatedText) {
          originalText = workingText;
          workingText = translation.translatedText;
          translationProvider = translation.provider;
          if (translation.detectedLanguage) {
            const normalized = normalizeLanguageCode(translation.detectedLanguage);
            if (normalized) {
              language = normalized;
            }
          }
        }
      }

      return {
        url: canonicalUrl,
        title: title ?? 'Untitled article',
        text: workingText,
        excerpt,
        originalText,
        translationProvider,
        language,
        tags: metadata.tags ?? [],
        keywords,
        contextSummary: summary,
        contextBullets: bullets,
        studyPrompts,
        channels: options.via ? [options.via, ...channels] : [...channels],
        structuredMetadata: metadata,
      };
    }
  }

  if (!text) {
    if (!html) {
      try {
        html = await fetchHtml(canonicalUrl);
      } catch (error) {
        logger.warn({ error, url: canonicalUrl }, 'ingest:scraper-fallback-fetch-error');
        return null;
      }
    }
    if (!html) return null;
    const dom = new JSDOM(html, { url: canonicalUrl });
    const bodyText = dom.window.document.body?.textContent?.replace(/\s+/g, ' ').trim();
    if (!bodyText || bodyText.length < 240) {
      return null;
    }
    text = bodyText;
    addChannel('fallback');
    const metadataChannels: ScrapeChannels[] = [];
    const meta = extractMeta(dom.window.document, metadataChannels);
    const jsonld = extractJsonLd(dom.window.document, metadataChannels);
    const alternateFeeds = extractAlternateFeeds(dom.window.document, metadataChannels);
    const microformats = extractMicroformats(dom.window.document, metadataChannels);
    const oEmbed = await fetchOEmbed(dom.window.document, canonicalUrl, metadataChannels);
    metadataChannels.forEach(addChannel);
    const merged = mergeMetadata(
      {
        ...jsonld,
        alternateFeeds,
        oEmbed,
        tags: [...(jsonld.tags ?? []), ...microformats.tags],
        authors: jsonld.authors?.length ? jsonld.authors : microformats.authors,
        excerpt: jsonld.excerpt ?? microformats.summary ?? meta.excerpt,
      },
      meta,
    );
    title = title ?? merged.title ?? dom.window.document.title ?? 'Untitled article';
    excerpt = excerpt ?? merged.excerpt;
    const metadataTags = merged.tags ?? [];
    const regionTag = inferRegionTag(canonicalUrl);
    const combinedTags = new Set<string>(metadataTags.filter(Boolean));
    if (regionTag) combinedTags.add(regionTag);
    const metadata: StructuredMetadata = {
      ...merged,
      tags: Array.from(combinedTags),
      alternateFeeds,
      oEmbed,
    };
    const keywords = extractKeywords(text, 30);
    const { summary, bullets } = buildContextSummary(text, metadata);
    const studyPrompts = buildStudyPrompts(keywords, metadata);
    const languageDetection = detectLanguage(text, options.languageHint ?? metadata.siteName);
    let language = languageDetection.code ?? normalizeLanguageCode(options.languageHint) ?? 'en';
    let workingText = text;
    let originalText: string | undefined;
    let translationProvider: string | undefined;
    if (language !== 'en') {
      const translation = await maybeTranslateToEnglish(workingText, language);
      if (translation?.translatedText) {
        originalText = workingText;
        workingText = translation.translatedText;
        translationProvider = translation.provider;
        if (translation.detectedLanguage) {
          const normalized = normalizeLanguageCode(translation.detectedLanguage);
          if (normalized) {
            language = normalized;
          }
        }
      }
    }
    return {
      url: canonicalUrl,
      title,
      text: workingText,
      excerpt,
      originalText,
      translationProvider,
      language,
      tags: Array.from(combinedTags),
      keywords,
      contextSummary: summary,
      contextBullets: bullets,
      studyPrompts,
      channels: options.via ? [options.via, ...channels] : [...channels],
      structuredMetadata: metadata,
    };
  }

  const metadata: StructuredMetadata = { tags: [], siteName: undefined };
  const keywords = extractKeywords(text, 30);
  const { summary, bullets } = buildContextSummary(text, metadata);
  const studyPrompts = buildStudyPrompts(keywords, metadata);

  const languageDetection = detectLanguage(text, options.languageHint);
  let language = languageDetection.code ?? normalizeLanguageCode(options.languageHint) ?? 'en';
  let workingText = text;
  let originalText: string | undefined;
  let translationProvider: string | undefined;
  if (language !== 'en') {
    const translation = await maybeTranslateToEnglish(workingText, language);
    if (translation?.translatedText) {
      originalText = workingText;
      workingText = translation.translatedText;
      translationProvider = translation.provider;
      if (translation.detectedLanguage) {
        const normalized = normalizeLanguageCode(translation.detectedLanguage);
        if (normalized) {
          language = normalized;
        }
      }
    }
  }

  if (options.via) {
    addChannel(options.via);
  }

  return {
    url: canonicalUrl,
    title: title ?? 'Untitled article',
    text: workingText,
    excerpt,
    originalText,
    translationProvider,
    language,
    tags: [],
    keywords,
    contextSummary: summary,
    contextBullets: bullets,
    studyPrompts,
    channels,
    structuredMetadata: metadata,
  };
}

export async function normalizeScrapedItem(
  item: ScrapeResult,
  source: { id: string; type: string; url: string },
): Promise<NormalizedItem> {
  const tags = new Set<string>(item.tags ?? []);
  const regionTag = inferRegionTag(item.url);
  if (regionTag) {
    tags.add(regionTag);
  }
  if (item.language && !tags.has(`lang:${item.language}`)) {
    tags.add(`lang:${item.language}`);
  }
  if (item.translationProvider) {
    tags.add('translated:en');
  }

  return {
    source,
    url: item.url,
    title: item.title,
    text: item.text,
    originalText: item.originalText,
    translationProvider: item.translationProvider,
    language: item.language,
    tags: Array.from(tags),
    keywords: item.keywords,
    tier: 'T2',
    provenance: {
      tier: 'T2',
      provider: source.url,
      channels: item.channels,
      structuredMetadata: item.structuredMetadata,
    },
    contextSummary: item.contextSummary,
    contextBullets: item.contextBullets,
    studyPrompts: item.studyPrompts,
    channels: item.channels,
    excerpt: item.excerpt,
    contextMetadata: {
      structured: item.structuredMetadata,
      keywords: item.keywords,
      oEmbed: item.structuredMetadata?.oEmbed,
      alternateFeeds: item.structuredMetadata?.alternateFeeds,
    },
  };
}
