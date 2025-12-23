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
        <Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-4xl flex-col overflow-y-auto rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-[color:var(--foreground)] shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-[color:var(--foreground)]">
                Learning mode
              </Dialog.Title>
              <p className="text-sm text-[color:var(--foreground-muted)]">
                Build a five-article outside path, then seal it with a recap quiz and impact hints.
              </p>
            </div>
            <Dialog.Close className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]">
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
                  <p className="text-sm font-medium text-[color:var(--foreground-muted)]">Topic</p>
                  <p className="text-lg font-semibold text-[color:var(--foreground)]">
                    {path.topic?.label ?? "Outside focus"}
                  </p>
                  <p className="text-xs uppercase tracking-widest text-[color:var(--foreground-muted)]">
                    Progress: {path.progress} / {path.required}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] hover:border-[color:var(--accent-cool)]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh path
                </button>
              </div>
              <div className="space-y-4">
                {path.steps.map((step) => (
                  <div
                    key={step.id}
                    className={clsx(
                      "rounded-2xl border bg-[color:var(--surface-elevated)] p-4",
                      step.kind === "quiz" ? "border-teal-700/40" : "border-[color:var(--border)]",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-[color:var(--foreground-muted)]">
                          {step.kind === "quiz" ? "Recap quiz" : "Article"}
                        </p>
                        <h3 className="text-base font-semibold text-[color:var(--foreground)]">
                          {step.kind === "quiz" ? step.title : step.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[color:var(--foreground-muted)]">
                        <span className="rounded-full border border-[color:var(--border)] px-2 py-1 capitalize">{step.status}</span>
                        {step.kind === "article" && (
                          <Link
                            href={step.url}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-2 py-1 text-xs text-teal-300 hover:border-teal-400"
                          >
                            <BookOpenCheck className="h-3.5 w-3.5" /> Open
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-3 text-sm text-[color:var(--foreground-muted)]">
                      {step.kind === "article" ? (
                        <>
                          <p>{step.summary}</p>
                          {step.highlights.length > 0 && (
                            <ul className="space-y-1 text-xs text-[color:var(--foreground-muted)]">
                              {step.highlights.map((highlight) => (
                                <li key={highlight} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[color:var(--accent-cool)]" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <div className="space-y-4">
                          {step.questions.map((question) => (
                            <div key={question.id} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--ink-soft)] p-3">
                              <p className="text-sm font-medium text-[color:var(--foreground)]">{question.prompt}</p>
                              {question.choices && (
                                <ul className="mt-2 space-y-1 text-xs text-[color:var(--foreground-muted)]">
                                  {question.choices.map((choice) => (
                                    <li key={choice} className="flex items-start gap-2">
                                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-teal-500" />
                                      <span>{choice}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <details className="mt-2 text-xs text-[color:var(--foreground-muted)]">
                                <summary className="cursor-pointer text-[color:var(--foreground-muted)]">Reveal answer</summary>
                                <p className="mt-1 text-[color:var(--foreground-muted)]">{question.answer}</p>
                              </details>
                            </div>
                          ))}
                          {step.impactHints.length > 0 && (
                            <div className="rounded-2xl border border-teal-700/40 bg-teal-950/20 p-3 text-xs text-teal-200">
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
                        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)] hover:border-[color:var(--foreground-muted)] disabled:cursor-not-allowed disabled:opacity-70"
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
            <div className="mt-10 flex items-center justify-center text-sm text-[color:var(--foreground-muted)]">
              Select "Learn" on an outside topic to generate your path.
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
