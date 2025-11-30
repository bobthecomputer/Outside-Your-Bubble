type ProgressRingProps = {
  value: number;
};

export function ProgressRing({ value }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-16 w-16">
      <div
        className="absolute inset-0 rounded-full border border-neutral-800"
        style={{ background: `conic-gradient(#a855f7 ${clamped}%, rgba(38,38,38,0.6) 0)` }}
      />
      <div className="absolute inset-2 flex items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-neutral-200">
        {Math.round(clamped)}%
      </div>
    </div>
  );
}
