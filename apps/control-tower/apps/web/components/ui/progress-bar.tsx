/** Barra de progreso 0–100 (Active Projects, doc 7). */
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-fg" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-fg-muted">{pct}%</span>
    </div>
  );
}
