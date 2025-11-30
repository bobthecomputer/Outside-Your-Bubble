import { useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { BookOpenCheck, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from "lucide-react";

import type { LearningPathView } from "@/types/deck";

import { ProgressRing } from "./progress-ring";

type LearningPathSheetProps = {
  path: LearningPathView | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onRefresh: () => Promise<void>;
  error: string | null;
  updatingStep: string | null;
  updateStep: (stepId: string, status: "seen" | "done" | "skipped") => Promise<void>;
};

export function LearningPathSheet({
  path,
  open,
  onOpenChange,
  onRefresh,
  error,
  updatingStep,
  updateStep,
}: LearningPathSheetProps) {
  const progressPercent = useMemo(() => {
    if (!path) return 0;
    const base = path.required === 0 ? 0 : (path.progress / path.required) * 100;
    const quizCompleted = path.steps.some((step) => step.kind === "quiz" && step.status === "done");
    return quizCompleted ? 100 : base;
  }, [path]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950/95 p-6 text-neutral-100 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-neutral-100">
                Learning mode
              </Dialog.Title>
              <p className="text-sm text-neutral-400">
                Build a five-article outside path, then seal it with a recap quiz and impact hints.
              </p>
            </div>
            <Dialog.Close className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-400 hover:text-neutral-100">
              Close
            </Dialog.Close>
          </div>
          {error ? (
            <p className="mt-6 text-sm text-rose-400">{error}</p>
          ) : path ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <ProgressRing value={progressPercent} />
                <div>
                  <p className="text-sm font-medium text-neutral-300">Topic</p>
                  <p className="text-lg font-semibold text-neutral-100">
                    {path.topic?.label ?? "Outside focus"}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Progress: {path.progress} / {path.required}</p>
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-200 hover:border-neutral-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh path
                </button>
              </div>
              <div className="space-y-4">
                {path.steps.map((step) => (
                  <div
                    key={step.id}
                    className={clsx(
                      "rounded-xl border bg-neutral-900/60 p-4",
                      step.kind === "quiz" ? "border-purple-700/40" : "border-neutral-800",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-neutral-400">
                          {step.kind === "quiz" ? "Recap quiz" : "Article"}
                        </p>
                        <h3 className="text-base font-semibold text-neutral-100">
                          {step.kind === "quiz" ? step.title : step.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="rounded-full border border-neutral-700 px-2 py-1 capitalize">{step.status}</span>
                        {step.kind === "article" && (
                          <Link
                            href={step.url}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-1 text-xs text-sky-400 hover:border-sky-500"
                          >
                            <BookOpenCheck className="h-3.5 w-3.5" /> Open
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-neutral-300">
                      {step.kind === "article" ? (
                        <>
                          <p>{step.summary}</p>
                          {step.highlights.length > 0 && (
                            <ul className="space-y-1 text-xs text-neutral-400">
                              {step.highlights.map((highlight) => (
                                <li key={highlight} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-600" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <div className="space-y-4">
                          {step.questions.map((question) => (
                            <div key={question.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
                              <p className="text-sm font-medium text-neutral-100">{question.prompt}</p>
                              {question.choices && (
                                <ul className="mt-2 space-y-1 text-xs text-neutral-400">
                                  {question.choices.map((choice) => (
                                    <li key={choice} className="flex items-start gap-2">
                                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500" />
                                      <span>{choice}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <details className="mt-2 text-xs text-neutral-500">
                                <summary className="cursor-pointer text-neutral-400">Reveal answer</summary>
                                <p className="mt-1 text-neutral-300">{question.answer}</p>
                              </details>
                            </div>
                          ))}
                          {step.impactHints.length > 0 && (
                            <div className="rounded-lg border border-purple-700/40 bg-purple-950/30 p-3 text-xs text-purple-200">
                              <p className="font-semibold uppercase tracking-widest">Impact hints</p>
                              <ul className="mt-2 space-y-1">
                                {step.impactHints.map((hint) => (
                                  <li key={hint} className="flex items-start gap-2">
                                    <Sparkles className="mt-0.5 h-3 w-3" />
                                    <span>{hint}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingStep === step.id}
                        onClick={() => updateStep(step.id, "done")}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {updatingStep === step.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronUp className="h-3.5 w-3.5" />}
                        Mark done
                      </button>
                      <button
                        type="button"
                        disabled={updatingStep === step.id}
                        onClick={() => updateStep(step.id, "seen")}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-300 hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Mark seen
                      </button>
                      <button
                        type="button"
                        disabled={updatingStep === step.id}
                        onClick={() => updateStep(step.id, "skipped")}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-600/50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-rose-300 hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {updatingStep === step.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex items-center justify-center text-sm text-neutral-400">
              Select "Learn" on an outside topic to generate your path.
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
