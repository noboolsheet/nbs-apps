import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Encabezado y armazón de una página de lista (F-29): migas de pan, título con contador, acción a la
 * derecha y el contenido debajo. Antes esto eran las mismas ~12 líneas de JSX copiadas en 17 vistas;
 * comparar `business/goals` con `knowledge/decisions` era comparar el mismo fichero dos veces.
 *
 * Que exista un sitio único importa más por lo que viene que por las líneas que ahorra: la ordenación
 * por columna y el filtro (F-28) se implementan aquí una vez, no diecisiete.
 *
 * El contenido va como `children` en vez de recibir columnas y filas: así la misma cáscara sirve para
 * una tabla (`RecordTable`), para varias pestañas (`Tabs`) o para un tablero, sin que este componente
 * tenga que saber de tablas.
 */
export interface Crumb {
  label: string;
  href: string;
}

export function ListPage({
  breadcrumb,
  title,
  count,
  subtitle,
  action,
  filters,
  children,
}: {
  /** Ruta hasta la sección padre. El último tramo (la propia lista) lo pone el componente con `title`. */
  breadcrumb?: readonly Crumb[];
  title: string;
  /** Contador junto al título. Omítelo cuando hay pestañas: cada una ya lleva el suyo. */
  count?: number;
  /** Texto o controles a la izquierda del botón de acción (p. ej. la zona horaria en Tareas). */
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Fila de filtros (`FilterTabs`) bajo el título. */
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="text-sm text-fg-muted">
          {breadcrumb.map((crumb) => (
            <span key={crumb.href}>
              <Link className="hover:underline" href={crumb.href}>
                {crumb.label}
              </Link>
              {' / '}
            </span>
          ))}
          {title}
        </nav>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {title}
          {count !== undefined && <span className="font-normal text-fg-subtle"> ({count})</span>}
        </h1>
        {(subtitle || action) && (
          <div className="flex items-center gap-3">
            {subtitle}
            {action}
          </div>
        )}
      </div>
      {filters}
      {children}
    </div>
  );
}
