import { z } from "zod";
import { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { readingTimeMinutes } from "@/lib/ingest/utils";
import { MAX_BULLETS, MAX_UNKNOWN_NOTES } from "@/lib/config";
import {
  describeSchema,
  generateJsonWithOllama,
} from "@/lib/models/community";

const summarySchema = z.object({
  headline: z.string().min(3),
  bullets: z.array(z.string()).max(MAX_BULLETS),
  claims: z
    .array(
      z.object({
        statement: z.string(),
        citation: z.string().url().optional(),
      }),
    )
    .default([]),
  citations: z
    .array(
      z.object({
        label: z.string(),
        url: z.string().url(),
        quote: z.string().max(180),
      }),
    )
    .default([]),
  reading_time: z.number().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  unknowns: z.array(z.string()).max(MAX_UNKNOWN_NOTES).default([]),
  reflection_prompt: z.string().min(3).optional(),
  micro_task: z
    .object({
      type: z.enum([
        "MATH_EXERCISE",
        "TECH_SNIPPET",
        "POLICY_PROMPT",
        "LEARNING_PRACTICE",
      ]),
      prompt: z.string(),
      solution: z.string().optional(),
    })
    .optional(),
});

type SummaryPayload = z.infer<typeof summarySchema>;

function defaultReflectionPrompt(title: string) {
  const focus = title && title.length > 0 ? title : "this update";
  return `What perspective from outside your usual sources might change how you view ${focus}?`;
}

function fallbackSummary({
  title,
  text,
}: {
  title: string;
  text: string;
}): SummaryPayload {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).filter(Boolean);
  const bullets = sentences.slice(0, MAX_BULLETS).map((sentence) => sentence.trim());
  return {
    headline: title || bullets[0] || "Update",
    bullets,
    claims: [],
    citations: [],
    reading_time: undefined,
    confidence: 0.3,
    unknowns: ["Detailed verification pending"],
    reflection_prompt: defaultReflectionPrompt(title),
    micro_task: {
      type: "LEARNING_PRACTICE",
      prompt: "List one question you still have about this item.",
      solution: "",
    },
  };
}

async function callCommunityModelForSummary({
  title,
  text,
  url,
  tier,
}: {
  title: string;
  text: string;
  url: string;
  tier: string;
}): Promise<SummaryPayload | null> {
  const prompt =
    "You are Outside Your Bubble's summarizer. Read the item metadata and craft a concise brief with citations, confidence, and a micro-task." +
    "\nReturn JSON with keys headline (string), bullets (array of up to four strings), claims (array of {statement,citation?}), citations (array of {label,url,quote})," +
    " confidence (0..1 number), reading_time (minutes as number), unknowns (array of up to three strings), reflection_prompt (string question inviting reflection), and micro_task (object with type, prompt, solution?)." +
    "\nKeep citations grounded in the provided URL unless alternate sources are specified." +
    "\nTitle: " +
    title +
    "\nTier: " +
    tier +
    "\nURL: " +
    url +
    "\nBody: " +
    text;

  const schemaHint = describeSchema({
    headline: "string",
    bullets: ["string"],
    claims: [{ statement: "string", citation: "string" }],
    citations: [{ label: "string", url: "https://example.com", quote: "string" }],
    reading_time: 4,
    confidence: 0.7,
    unknowns: ["string"],
    reflection_prompt: "string",
    micro_task: {
      type: "LEARNING_PRACTICE",
      prompt: "string",
      solution: "string",
    },
  });

  const payload = await generateJsonWithOllama<SummaryPayload>({
    prompt,
    schemaDescription: schemaHint,
  });

  if (!payload) {
    return null;
  }

  try {
    return summarySchema.parse(payload);
  } catch (error) {
    logger.warn({ error }, "summarizer:community-parse-failed");
    return null;
  }
}

export async function summarizeItem(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item?.text) {
    throw new Error(`Item ${itemId} missing text`);
  }

  const payload =
    (await callCommunityModelForSummary({
      title: item.title ?? "",
      text: item.text,
      url: item.url,
      tier: item.tier,
    })) ??
    fallbackSummary({ title: item.title ?? "", text: item.text });

  const readingTime =
    payload.reading_time ?? readingTimeMinutes(item.text ?? item.summaryText ?? "");
  const reflectionPrompt = payload.reflection_prompt ?? defaultReflectionPrompt(item.title ?? "");

  const summary = await prisma.summary.upsert({
    where: { itemId },
    create: {
      itemId,
      headline: payload.headline,
      bullets: payload.bullets,
      claims: payload.claims,
      citations: payload.citations,
      readingTime,
      confidence: payload.confidence,
      unknowns: payload.unknowns,
      microTaskId: undefined,
      reflectionPrompt,
    },
    update: {
      headline: payload.headline,
      bullets: payload.bullets,
      claims: payload.claims,
      citations: payload.citations,
      readingTime,
      confidence: payload.confidence,
      unknowns: payload.unknowns,
      reflectionPrompt,
    },
  });

  let taskId: string | null = summary.microTaskId ?? null;
  if (payload.micro_task) {
    const taskType = TaskType[payload.micro_task.type as keyof typeof TaskType] ?? TaskType.LEARNING_PRACTICE;
    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          type: taskType,
          prompt: payload.micro_task.prompt,
          solution: payload.micro_task.solution,
        },
      });
    } else {
      const task = await prisma.task.create({
        data: {
          itemId,
          type: taskType,
          prompt: payload.micro_task.prompt,
          solution: payload.micro_task.solution,
        },
      });
      taskId = task.id;
    }
  } else if (taskId) {
    await prisma.task.delete({ where: { id: taskId } });
    taskId = null;
  }

  await prisma.summary.update({
    where: { id: summary.id },
    data: { microTaskId: taskId ?? undefined },
  });

  await prisma.item.update({
    where: { id: itemId },
    data: {
      summaryText: payload.bullets.join(" "),
    },
  });

  return summary;
}
