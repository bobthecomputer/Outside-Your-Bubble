import type { Item, Summary, Verification, Lens, Task } from "@prisma/client";
import Link from "next/link";
import clsx from "clsx";
import { BadgeCheck, Brain, Globe, Info, ShieldAlert, ShieldCheck } from "lucide-react";

export type FeedItem = Item & {
  summary: Summary | null;
  verification: Verification | null;
  lenses: Lens[];
  tasks: Task[];
};

const statusCopy: Record<Verification["status"], { label: string; tone: string }> = {
  DEVELOPING: { label: "Developing", tone: "text-amber-400 border-amber-500/40" },
  TENTATIVE: { label: "Tentatively confirmed", tone: "text-sky-400 border-sky-500/40" },
  CONTESTED: { label: "Contested", tone: "text-rose-400 border-rose-500/40" },
  CONFIRMED: { label: "Confirmed", tone: "text-emerald-400 border-emerald-500/40" },
};

const tierCopy: Record<Item["tier"], { label: string; tone: string }> = {
  T0: { label: "Primary", tone: "bg-emerald-500/10 text-emerald-400" },
  T1: { label: "Peer-reviewed", tone: "bg-sky-500/10 text-sky-400" },
  T1b: { label: "Preprint", tone: "bg-purple-500/10 text-purple-400" },
  T2: { label: "News", tone: "bg-amber-500/10 text-amber-400" },
  T3: { label: "Developing", tone: "bg-rose-500/10 text-rose-400" },
};

type EvidenceRecord = {
  claim: string;
  url: string;
  quote: string;
};

function parseEvidence(raw: unknown): EvidenceRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const claim = "claim" in entry && typeof (entry as { claim?: unknown }).claim === "string" ? (entry as { claim: string }).claim : null;
      const url = "url" in entry && typeof (entry as { url?: unknown }).url === "string" ? (entry as { url: string }).url : null;
      const quote = "quote" in entry && typeof (entry as { quote?: unknown }).quote === "string" ? (entry as { quote: string }).quote : null;
      if (!claim || !url || !quote) return null;
      return { claim, url, quote };
    })
    .filter((entry): entry is EvidenceRecord => Boolean(entry));
}

function lensBullets(payload: Lens["payload"]): string[] {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray((payload as { bullets?: unknown }).bullets)) {
    return ((payload as { bullets?: unknown }).bullets as unknown[])
      .filter((value): value is string => typeof value === "string");
  }
  return [];
}

function PersonalImpact({ item }: { item: FeedItem }) {
  const focus = item.summary?.headline ?? item.title ?? "this story";
  const prompts = [
    `Where could "${focus}" intersect with your current projects?`,
    "What action would you take if this trend accelerates?",
  ];
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-200">
        <Brain className="h-4 w-4 text-fuchsia-400" /> Personal Impact (not advice)
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-400">
        {prompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
    </section>
  );
}

export function ItemCard({ item }: { item: FeedItem }) {
  const lens = item.lenses.find((l) => l.lensType === "domain");
  const microTask = item.summary?.microTaskId
    ? item.tasks.find((task) => task.id === item.summary?.microTaskId)
    : undefined;
  const statusMeta = item.verification ? statusCopy[item.verification.status] : null;
  const tierMeta = tierCopy[item.tier];
  const evidence = item.verification ? parseEvidence(item.verification.evidence) : [];

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-neutral-900 bg-neutral-950/80 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={item.url} target="_blank" className="text-xl font-semibold text-neutral-100 hover:underline">
            {item.summary?.headline ?? item.title ?? item.url}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className={clsx("rounded-full px-2 py-1", tierMeta.tone)}>{tierMeta.label}</span>
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-neutral-800 px-2 py-1">
                #{tag}
              </span>
            ))}
            {item.publishedAt && (
              <span>{new Date(item.publishedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
        {statusMeta && (
          <span className={clsx("flex items-center gap-2 rounded-full border px-3 py-1 text-xs", statusMeta.tone)}>
            {item.verification?.status === "CONFIRMED" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : item.verification?.status === "CONTESTED" ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            {statusMeta.label}
          </span>
        )}
      </div>

      {item.summary && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200">Key points</h3>
          <ul className="space-y-2 text-sm text-neutral-300">
            {item.summary.bullets.map((bullet, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-neutral-500" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.summary?.reflectionPrompt && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200">Reflection prompt</h3>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            {item.summary.reflectionPrompt}
          </div>
        </section>
      )}

      {item.verification && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200">Verification report</h3>
          <div className="space-y-2 text-sm text-neutral-300">
            {evidence.length > 0 ? (
              evidence.map((entry) => (
                <div key={`${entry.url}-${entry.claim}`} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <BadgeCheck className="h-4 w-4 text-emerald-400" /> {entry.claim}
                  </div>
                  <p className="mt-2 text-neutral-400">{entry.quote}</p>
                  <Link href={entry.url} target="_blank" className="mt-2 block text-xs text-sky-400 hover:underline">
                    {entry.url}
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-neutral-400">Evidence pending</p>
            )}
          </div>
        </section>
      )}

      {lens && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200">Context lens</h3>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              <Globe className="h-4 w-4 text-lime-400" /> Domain primer
            </div>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              {lensBullets(lens.payload).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {microTask && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-200">Micro-task</h3>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-sm text-neutral-300">
            <p>{microTask.prompt}</p>
            {microTask.solution && (
              <details className="mt-2 text-xs text-neutral-500">
                <summary className="cursor-pointer text-neutral-400">Reveal suggestion</summary>
                <p className="mt-1 whitespace-pre-line text-neutral-400">{microTask.solution}</p>
              </details>
            )}
          </div>
        </section>
      )}

      <PersonalImpact item={item} />
    </article>
  );
}
