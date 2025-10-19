import { randomUUID } from "crypto";
import type { Item, LearningPath, Summary, Topic } from "@prisma/client";
import { prisma } from "./prisma";

export type LearningStepStatus = "pending" | "seen" | "done" | "skipped";

export type LearningArticleStep = {
  id: string;
  kind: "article";
  itemId: string;
  title: string;
  url: string;
  summary: string;
  highlights: string[];
  status: LearningStepStatus;
};

export type QuizQuestion = {
  id: string;
  type: "recall" | "multiple_choice";
  prompt: string;
  answer: string;
  choices?: string[];
};

export type LearningQuizStep = {
  id: string;
  kind: "quiz";
  title: string;
  questions: QuizQuestion[];
  impactHints: string[];
  status: LearningStepStatus;
};

export type LearningStep = LearningArticleStep | LearningQuizStep;

export type LearningPathView = {
  id: string;
  status: string;
  required: number;
  progress: number;
  topic?: { slug: string; label: string } | null;
  topicId?: string | null;
  steps: LearningStep[];
  createdAt: string;
  updatedAt: string;
};

type LearningPathWithTopic = LearningPath & { topic: Topic | null };

type ItemWithSummary = Item & { summary: Summary | null };

function summarizeItem(item: ItemWithSummary): { summary: string; highlights: string[] } {
  const summary = item.summary;
  if (!summary) {
    return {
      summary: item.title ?? item.url,
      highlights: [],
    };
  }

  const bullets = (summary.bullets ?? []).filter((entry): entry is string => typeof entry === "string");
  const main = summary.headline ?? bullets[0] ?? item.title ?? item.url;
  return {
    summary: main,
    highlights: bullets.slice(0, 3),
  };
}

function articleStepFromItem(item: ItemWithSummary): LearningArticleStep | null {
  const { summary, highlights } = summarizeItem(item);
  if (!summary) return null;
  if (!item.summary) return null;

  return {
    id: randomUUID(),
    kind: "article",
    itemId: item.id,
    title: item.summary.headline ?? item.title ?? item.url,
    url: item.url,
    summary,
    highlights,
    status: "pending",
  };
}

function buildQuizStep(articles: LearningArticleStep[]): LearningQuizStep {
  const questions: QuizQuestion[] = articles.slice(0, 3).map((article) => ({
    id: randomUUID(),
    type: "recall",
    prompt: `What was the central idea of “${article.title}”?`,
    answer: article.summary,
    choices: article.highlights.length >= 3 ? article.highlights.slice(0, 3) : undefined,
  }));

  const impactHints = articles.flatMap((article) => article.highlights).slice(0, 3);

  return {
    id: randomUUID(),
    kind: "quiz",
    title: "Learning path recap",
    questions,
    impactHints,
    status: "pending",
  };
}

function formatPath(path: LearningPathWithTopic): LearningPathView {
  const steps = (path.steps as unknown as LearningStep[]) ?? [];
  return {
    id: path.id,
    status: path.status,
    required: path.required,
    progress: path.progress,
    topic: path.topic ? { slug: path.topic.slug, label: path.topic.label } : null,
    topicId: path.topicId,
    steps,
    createdAt: path.createdAt.toISOString(),
    updatedAt: path.updatedAt.toISOString(),
  };
}

async function generateLearningSteps(topicId?: string, required = 5): Promise<LearningStep[]> {
  const items = await prisma.item.findMany({
    where: {
      summary: { isNot: null },
      ...(topicId ? { topicId } : {}),
    },
    include: {
      summary: true,
    },
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: required * 3,
  });

  const articleSteps: LearningArticleStep[] = [];
  for (const item of items) {
    const step = articleStepFromItem(item);
    if (!step) continue;
    articleSteps.push(step);
    if (articleSteps.length >= required) {
      break;
    }
  }

  if (articleSteps.length === 0) {
    throw new Error("Not enough content to build learning path");
  }

  const steps: LearningStep[] = [...articleSteps];
  steps.push(buildQuizStep(articleSteps));
  return steps;
}

export async function startOrResumeLearningPath(userId: string, topicId?: string): Promise<LearningPathView> {
  const existing = await prisma.learningPath.findFirst({
    where: {
      userId,
      ...(topicId ? { topicId } : {}),
      status: { in: ["active", "pending"] },
    },
    include: {
      topic: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return formatPath(existing);
  }

  const steps = await generateLearningSteps(topicId);
  const required = steps.filter((step) => step.kind === "article").length;

  const created = await prisma.learningPath.create({
    data: {
      userId,
      topicId,
      required,
      progress: 0,
      steps,
    },
    include: {
      topic: true,
    },
  });

  return formatPath(created);
}

export async function updateLearningProgress(
  userId: string,
  stepId: string,
  status: "seen" | "done" | "skipped",
): Promise<LearningPathView> {
  const path = await prisma.learningPath.findFirst({
    where: {
      userId,
      status: { in: ["active", "pending"] },
    },
    include: {
      topic: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!path) {
    throw new Error("Learning path not found");
  }

  const steps = ((path.steps as unknown as LearningStep[]) ?? []).map((step) => ({ ...step }));
  const targetIndex = steps.findIndex((step) => step.id === stepId);
  if (targetIndex === -1) {
    throw new Error("Step not found");
  }

  steps[targetIndex] = { ...steps[targetIndex], status } as LearningStep;

  const completedArticles = steps.filter((step) => step.kind === "article" && step.status === "done").length;
  const quizCompleted = steps.some((step) => step.kind === "quiz" && step.status === "done");

  const nextStatus = completedArticles >= path.required && quizCompleted ? "completed" : "active";

  const updated = await prisma.learningPath.update({
    where: { id: path.id },
    data: {
      steps,
      progress: completedArticles,
      status: nextStatus,
    },
    include: {
      topic: true,
    },
  });

  return formatPath(updated);
}
