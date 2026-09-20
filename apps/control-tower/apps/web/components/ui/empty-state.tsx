import type { ReactNode } from 'react';

/** Estado vacío consistente (doc 7 §14). */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-sm text-fg-muted">{hint}</p>}
      {action}
    </div>
  );
}
