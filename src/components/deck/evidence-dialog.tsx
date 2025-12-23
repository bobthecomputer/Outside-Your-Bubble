import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Bookmark, Loader2 } from "lucide-react";

import type { EvidenceDrawer } from "@/types/deck";

type EvidenceDialogProps = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  drawer: EvidenceDrawer | null;
  loading: boolean;
  error: string | null;
};

export function EvidenceDialog({ open, onOpenChange, drawer, loading, error }: EvidenceDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-3xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 text-[color:var(--foreground)] shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">Evidence drawer</Dialog.Title>
            <Dialog.Close className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground-muted)] hover:text-[color:var(--foreground)]">
              Close
            </Dialog.Close>
          </div>
          {loading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-[color:var(--foreground-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading citations.
            </div>
          ) : error ? (
            <p className="mt-6 text-sm text-rose-400">{error}</p>
          ) : drawer ? (
            <div className="mt-6 space-y-4">
              <h3 className="text-base font-semibold text-[color:var(--foreground)]">{drawer.headline ?? "Evidence"}</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {drawer.chips.map((chip) => (
                  <div key={chip.code} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--foreground-muted)]">{chip.code}</p>
                    <ul className="mt-3 space-y-2 text-sm text-[color:var(--foreground-muted)]">
                      {chip.entries.length === 0 ? (
                        <li className="text-[color:var(--foreground-muted)]">Nothing yet</li>
                      ) : (
                        chip.entries.map((entry) => (
                          <li key={`${entry.label}-${entry.url ?? ""}`} className="space-y-1">
                            <p>{entry.label}</p>
                            {entry.detail && <p className="text-xs text-[color:var(--foreground-muted)]">{entry.detail}</p>}
                            {entry.url && (
                              <Link
                                href={entry.url}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs text-teal-300 hover:underline"
                              >
                                <Bookmark className="h-3 w-3" /> Source
                              </Link>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[color:var(--foreground-muted)]">Select a card to view its supporting evidence.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
