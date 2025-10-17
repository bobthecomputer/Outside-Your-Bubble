import { logger } from "@/lib/logger";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODELS = [
  "qwen2.5:4b-instruct",
  "gemma2:2b-instruct",
  "llama3.2:3b-instruct",
  "smollm2:1.7b-instruct",
  "phi3:mini",
];

function getBaseUrl() {
  const raw = process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getModelCandidates(): string[] {
  const configured = process.env.OLLAMA_MODELS ?? process.env.OLLAMA_MODEL;
  if (!configured) {
    return DEFAULT_MODELS;
  }

  const candidates = configured
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return candidates.length > 0 ? candidates : DEFAULT_MODELS;
}

async function callOllama(payload: Record<string, unknown>): Promise<string | null> {
  const baseUrl = getBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: false, ...payload }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "community-model:ollama-nok");
      return null;
    }
    const data = (await response.json()) as { response?: string };
    const text = data.response?.trim();
    return text && text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ error }, "community-model:ollama-error");
    return null;
  }
}

export async function generateJsonWithOllama<T>({
  prompt,
  schemaDescription,
}: {
  prompt: string;
  schemaDescription?: string;
}): Promise<T | null> {
  const instruction = schemaDescription
    ? `${prompt}\nReturn a single valid JSON object matching this shape: ${schemaDescription}.`
    : `${prompt}\nReturn a single valid JSON value.`;
  for (const model of getModelCandidates()) {
    const result = await callOllama({ model, prompt: instruction, format: "json" });
    if (!result) {
      continue;
    }

    try {
      return JSON.parse(result) as T;
    } catch (error) {
      logger.warn({ error, result, model }, "community-model:json-parse-error");
    }
  }

  return null;
}

export function describeSchema(example: unknown): string {
  try {
    return JSON.stringify(example);
  } catch {
    return '{"error":"unable to serialize schema"}';
  }
}
