import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Fila de filtros por enlace (F-29): las pestañas que cambian la vista con un search-param
 * (`/projects?tab=`, `/crm/clients?status=`, `/tasks?view=`). Son enlaces de verdad, no estado de
 * cliente: la vista queda en la URL, se puede compartir y el Home enlaza directo a una pestaña concreta.
 *
 * No confundir con `<Tabs>`: aquél es de cliente y alterna contenido ya cargado (Pagos, Revisión); éste
 * navega y vuelve a consultar. La regla práctica: si cambia lo que se pide al servidor, es `FilterTabs`.
 */
export interface FilterTab {
  key: string;
  label: string;
  href: string;
  /** Se pinta junto a la etiqueta. Omítelo si contarlo obliga a traer datos que no necesitas. */
  count?: number;
}

export function FilterTabs({
  tabs,
  activeKey,
  trailing,
}: {
  tabs: readonly FilterTab[];
  activeKey: string;
  /** Enlace suelto alineado a la derecha (p. ej. «Ver todas las tareas» en Proyectos). */
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === activeKey ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            tab.key === activeKey ? 'border-fg font-medium' : 'border-transparent text-fg-muted'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="font-normal text-fg-subtle"> ({tab.count})</span>}
        </Link>
      ))}
      {trailing && <div className="ml-auto pb-1">{trailing}</div>}
    </div>
  );
}
