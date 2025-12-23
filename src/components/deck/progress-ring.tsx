type ProgressRingProps = {
  value: number;
};

export function ProgressRing({ value }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-16 w-16">
      <div
        className="absolute inset-0 rounded-full border border-[color:var(--border)]"
        style={{ background: `conic-gradient(var(--accent-cool) ${clamped}%, rgba(42,50,61,0.6) 0)` }}
      />
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-[color:var(--ink-strong)] text-sm font-semibold text-[color:var(--foreground)]">
        {Math.round(clamped)}%
      </div>
    </div>
  );
}
