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
      <section className="rounded-xl border border-neutral-900 bg-neutral-950/80 p-6 text-neutral-200 shadow-lg">
        <h1 className="text-2xl font-semibold">Wider view. Better you.</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Outside Your Bubble pulls from scholarly sources, filings, and trustworthy news to surface perspectives beyond your
          usual feed. Each item carries provenance tiers, verification status, and a quick micro-task to help you internalize what
          matters.
        </p>
      </section>
      <div className="grid gap-6">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-8 text-center text-neutral-500">
            Run the ingest command (⌘K) to fetch the first brief.
          </p>
        ) : (
          items.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </div>
    </main>
  );
}
