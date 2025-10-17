"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import clsx from "clsx";

const paletteCommands = [
  { id: "ingest:sample", label: "Ingest sample sources" },
  { id: "summarize:pending", label: "Summarize pending items" },
  { id: "verify:pending", label: "Verify pending items" },
  { id: "rank:train", label: "Train ranking policy (stub)" },
  { id: "feedback:report", label: "Feedback report" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleKey = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen((value) => !value);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const runCommand = async (commandId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: commandId }),
      });
      if (!response.ok) {
        throw new Error(`Command failed with status ${response.status}`);
      }
      const data = await response.json();
      setMessage(data.message ?? "Command executed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Command failed");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-neutral-800/40 bg-neutral-900/40 px-3 py-2 text-sm text-neutral-200 shadow-sm backdrop-blur hover:bg-neutral-900"
        >
          <Terminal className="h-4 w-4" />
          Command Palette
          <span className="ml-4 hidden rounded-sm border border-neutral-700 px-1 text-xs text-neutral-400 sm:inline-flex">
            ⌘K
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-24 w-[90vw] max-w-xl -translate-x-1/2 rounded-xl border border-neutral-800 bg-neutral-950/95 text-neutral-100 shadow-xl">
          <Command className="w-full rounded-xl bg-transparent text-sm">
            <div className="flex items-center border-b border-neutral-800 px-3">
              <Terminal className="mr-2 h-4 w-4 text-neutral-500" />
              <Command.Input
                placeholder="Search commands..."
                autoFocus
                className="h-12 w-full bg-transparent text-base outline-none placeholder:text-neutral-500"
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto">
              <Command.Empty className="px-4 py-6 text-center text-neutral-500">
                No commands found
              </Command.Empty>
              <Command.Group heading="Actions" className="px-2 py-2 text-xs uppercase tracking-wide text-neutral-500">
                {paletteCommands.map((command) => (
                  <Command.Item
                    key={command.id}
                    value={command.id}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-200",
                      "data-[selected=true]:bg-neutral-800",
                    )}
                    onSelect={() => runCommand(command.id)}
                  >
                    <span>{command.label}</span>
                    <span className="text-xs text-neutral-500">{command.id}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
          <div className="border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running command...
              </span>
            ) : (
              message ?? "Use the palette to run ingest, verify, or ranking commands."
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
