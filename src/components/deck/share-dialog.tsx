'use client';
'use client';

import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import type { Dispatch, SetStateAction } from "react";
import { Sparkles } from "lucide-react";

import type { DeckCard, ShareDialogState } from "@/types/deck";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: DeckCard | null;
  shareState: ShareDialogState;
  setShareState: Dispatch<SetStateAction<ShareDialogState>>;
  partnerOptions: Array<{
    code: string;
    name: string;
    description: string;
    regions: string[];
    languages: string[];
  }>;
  onSubmit: () => void;
  togglePartner: (code: string) => void;
};

export function ShareDialog({
  open,
  onOpenChange,
  card,
  shareState,
  setShareState,
  partnerOptions,
  onSubmit,
  togglePartner,
}: ShareDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-950/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-100">Partner pitch beta</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-neutral-400">
                  Share especially novel coverage with vetted cross-border newsrooms. Submissions stay private until a curator approves them.
                </Dialog.Description>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
              >
                Close
              </button>
            </div>

            {card ? (
              <form
                className="mt-5 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSubmit();
                }}
              >
                <label className="block text-sm font-semibold text-neutral-200">
                  Headline for partners
                  <input
                    type="text"
                    value={shareState.title}
                    maxLength={200}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        title: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder="Give partners context in a sentence"
                    required
                  />
                </label>

                <label className="block text-sm font-semibold text-neutral-200">
                  Short summary
                  <textarea
                    rows={4}
                    value={shareState.summary}
                    maxLength={800}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        summary: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder="Why this story matters and what makes it distinct"
                  />
                </label>

                <label className="block text-sm font-semibold text-neutral-200">
                  Context summary
                  <textarea
                    rows={3}
                    value={shareState.contextSummary}
                    maxLength={600}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        contextSummary: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder="Add 1-2 sentences of framing the partners can quote"
                  />
                </label>

                <label className="block text-sm font-semibold text-neutral-200">
                  Study prompts (one per line)
                  <textarea
                    rows={3}
                    value={shareState.studyPromptsText}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        studyPromptsText: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder={`e.g.\nWhat does this mean for ${card.topic?.label ?? "the region"}?`}
                  />
                </label>

                {card.channels.length > 0 && (
                  <fieldset className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                    <legend className="text-sm font-semibold text-neutral-200">Distribution channels</legend>
                    <p className="text-xs text-neutral-500">Toggle which discovery paths should receive this pitch.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {card.channels.map((channel) => {
                        const checked = shareState.channels.includes(channel);
                        return (
                          <label
                            key={channel}
                            className={clsx(
                              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-widest",
                              checked
                                ? "border-emerald-500/60 text-emerald-200"
                                : "border-neutral-700 text-neutral-400 hover:border-emerald-500/40 hover:text-emerald-200",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() =>
                                setShareState((prev) => {
                                  const next = new Set(prev.channels);
                                  if (checked) {
                                    next.delete(channel);
                                  } else {
                                    next.add(channel);
                                  }
                                  return {
                                    ...prev,
                                    channels: Array.from(next),
                                    status: prev.status === "submitting" ? prev.status : "idle",
                                    message: null,
                                  };
                                })
                              }
                            />
                            <Sparkles className="h-3 w-3" aria-hidden="true" /> {channel}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                <label className="block text-sm font-semibold text-neutral-200">
                  Novel angle or context
                  <input
                    type="text"
                    value={shareState.noveltyAngle}
                    maxLength={200}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        noveltyAngle: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder="e.g. Regional coalition challenges dominant narrative"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-neutral-200">
                    Original language code
                    <input
                      type="text"
                      value={shareState.originalLanguage ?? ""}
                      maxLength={12}
                      onChange={(event) =>
                        setShareState((prev) => ({
                          ...prev,
                          originalLanguage: event.target.value,
                          status: prev.status === "submitting" ? prev.status : "idle",
                          message: null,
                        }))
                      }
                      className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                      placeholder={card.language ?? "en"}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-neutral-200">
                    Translation provider
                    <input
                      type="text"
                      value={shareState.translationProvider ?? ""}
                      maxLength={40}
                      onChange={(event) =>
                        setShareState((prev) => ({
                          ...prev,
                          translationProvider: event.target.value,
                          status: prev.status === "submitting" ? prev.status : "idle",
                          message: null,
                        }))
                      }
                      className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                      placeholder={card.translationProvider ?? "google-translate"}
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-neutral-200">
                  Canonical URL
                  <input
                    type="url"
                    value={shareState.url}
                    onChange={(event) =>
                      setShareState((prev) => ({
                        ...prev,
                        url: event.target.value,
                        status: prev.status === "submitting" ? prev.status : "idle",
                        message: null,
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
                    placeholder={card.source.url}
                  />
                </label>

                <div>
                  <p className="text-sm font-semibold text-neutral-200">Partner outlets</p>
                  <p className="text-xs text-neutral-500">Select up to five destinations for this pitch.</p>
                  <div className="mt-3 grid gap-3">
                    {partnerOptions.map((partner) => (
                      <label
                        key={partner.code}
                        className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-left text-sm text-neutral-300"
                      >
                        <input
                          type="checkbox"
                          checked={shareState.partners.includes(partner.code)}
                          onChange={() => togglePartner(partner.code)}
                          className="mt-1 h-4 w-4 flex-shrink-0 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-semibold text-neutral-100">{partner.name}</p>
                          <p className="text-xs text-neutral-400">{partner.description}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500">
                            Regions: {partner.regions.join(", ")} • Languages: {partner.languages.join(", ")}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {shareState.message && (
                  <div
                    className={clsx(
                      "rounded-2xl border px-3 py-2 text-sm",
                      shareState.status === "success"
                        ? "border-emerald-600/60 bg-emerald-950/30 text-emerald-200"
                        : shareState.status === "error"
                          ? "border-rose-600/60 bg-rose-950/30 text-rose-200"
                          : "border-sky-600/60 bg-sky-950/30 text-sky-200",
                    )}
                  >
                    {shareState.message}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shareState.status === "submitting"}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 bg-emerald-900/40 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-200 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {shareState.status === "submitting" ? "Sending." : "Send to partner mesh"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-6 text-sm text-neutral-400">Load a card from the deck to pitch it to partners.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
