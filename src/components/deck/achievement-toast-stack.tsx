import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";

import type { AchievementToast } from "@/types/deck";

type AchievementToastStackProps = {
  toasts: AchievementToast[];
  dismiss: (id: string) => void;
};

export function AchievementToastStack({ toasts, dismiss }: AchievementToastStackProps) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="status"
            className="pointer-events-auto rounded-2xl border border-emerald-600/40 bg-neutral-950/95 p-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-emerald-300">
              <Award className="h-5 w-5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-neutral-100">{toast.title}</p>
                <p className="text-xs text-neutral-400">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="ml-auto text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-100"
                aria-label="Dismiss achievement notification"
              >
                Close
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
