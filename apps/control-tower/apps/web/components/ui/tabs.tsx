'use client';

import { useState, type ReactNode } from 'react';

/**
 * Tabs cliente (doc 7 §23). Recibe paneles ya renderizados (server-friendly como children).
 * `actions` se pinta al final de la MISMA barra de pestañas: para enlaces secundarios que deben quedar a la altura
 * de los filtros, no pegados al título (que es donde va el botón de crear).
 */
export function Tabs({
  tabs,
  actions,
  defaultIndex = 0,
}: {
  tabs: { label: string; content: ReactNode }[];
  actions?: ReactNode;
  /** Pestaña abierta al entrar. Permite enlazar a una vista concreta (p. ej. el aviso de pagos retrasados del Home). */
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              i === active
                ? 'border-fg font-medium'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
        {actions && <div className="ml-auto flex items-center gap-3 pb-1">{actions}</div>}
      </div>
      <div>{tabs[active]?.content}</div>
    </div>
  );
}
