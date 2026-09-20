import type { ReactNode } from 'react';

export interface DLItem {
  label: string;
  value: ReactNode;
}

/** Ficha campo→valor (read-only). Dos columnas en desktop, apiladas en móvil. */
export function DescriptionList({ items }: { items: DLItem[] }) {
  return (
    <dl className="flex flex-col divide-y divide-line-subtle">
      {items.map((it, i) => (
        <div key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
          <dt className="w-48 shrink-0 text-sm text-fg-muted">{it.label}</dt>
          <dd className="min-w-0 flex-1 text-sm">{it.value === null || it.value === undefined || it.value === '' ? <span className="text-fg-subtle">—</span> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
