import type { ReactNode } from 'react';

/**
 * Tabla de entidades genérica (doc 7 §23 EntityTable). Server-friendly: recibe columnas y filas.
 * En móvil se hace scroll horizontal dentro de su contenedor (nunca desborda el body).
 */
export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /**
   * Valor PLANO de la celda (F-28). Sirve para dos cosas a la vez: **ordenar** por esa columna y que la fila
   * entre en el **filtro rápido**.
   *
   * Hace falta porque `cell` devuelve un `ReactNode` que se prerenderiza en el servidor: el cliente recibe
   * JSX ya pintado y no tiene forma de saber qué texto o qué fecha hay dentro. Con `value` el servidor manda
   * también el dato en crudo.
   *
   * Sin `value`, la columna simplemente **no es ordenable** y su contenido no cuenta para el filtro — que es
   * lo correcto para columnas de acciones o de controles interactivos.
   */
  value?: (row: T) => string | number | Date | null | undefined;
}

export function EntityTable<T>({
  columns,
  rows,
  getKey,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-muted">
            {columns.map((c) => (
              <th key={c.header} className={`px-3 py-2 font-medium ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              className="border-b border-line-subtle last:border-0 hover:bg-surface-muted/40"
            >
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-2 ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
