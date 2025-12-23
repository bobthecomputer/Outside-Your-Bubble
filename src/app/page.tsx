import { prisma } from "@/lib/prisma";
import { ItemCard } from "@/components/feed/item-card";
import type { FeedItem } from "@/components/feed/item-card";

export default async function Home() {
  const items = (await prisma.item.findMany({
    include: {
      summary: true,
      verification: true,
      lenses: true,
      tasks: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 8,
  })) as FeedItem[];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-[color:var(--foreground)] shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_top_left,_rgba(213,166,72,0.15),_transparent_60%),radial-gradient(700px_circle_at_bottom_right,_rgba(43,154,139,0.18),_transparent_65%)]" />
        <div className="relative space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--foreground-muted)]">Signal brief</p>
          <h1 className="text-3xl font-semibold">Wider view. Better you.</h1>
          <p className="max-w-2xl text-sm text-[color:var(--foreground-muted)]">
            Outside Your Bubble pulls from scholarly sources, filings, and trustworthy news to surface perspectives beyond your
            usual feed. Each item carries provenance tiers, verification status, and a quick micro-task to help you internalize what
            matters.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-[color:var(--foreground-muted)]">
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Verified provenance</span>
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Cross-region coverage</span>
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">Actionable micro-tasks</span>
          </div>
        </div>
      </section>
      <div className="grid gap-6">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-glass)] p-8 text-center text-sm text-[color:var(--foreground-muted)]">
            Run the ingest command (?K) to fetch the first brief.
          </p>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </main>
  );
}
