import type { ReactNode } from 'react';
import { type Column } from './entity-table';
import { DataTable } from './data-table';
import { EmptyState } from './empty-state';

/**
 * Tabla de registros con su estado vacío (F-29). Es la pieza que faltaba entre `Column<T>` y `DataTable`.
 *
 * **Por qué existe:** `DataTable` es un componente de CLIENTE (mantiene la selección), así que no puede
 * recibir las funciones `cell` de `Column<T>` — no son serializables a través del límite servidor→cliente.
 * La solución era prerenderizar las celdas en el servidor, y eso obligaba a repetir estas dos líneas en
 * cada una de las 17 vistas que usan tabla:
 *
 *     columns={columns.map(({ header, className }) => ({ header, className }))}
 *     rows={rows.map((r) => ({ id: r.id, cells: columns.map((c) => c.cell(r)) }))}
 *
 * Aquí se hace UNA vez. De paso absorbe el `rows.length === 0 ? <EmptyState/> : <DataTable/>`, que era el
 * otro trozo copiado en todas partes.
 *
 * Sirve igual para una lista completa que para una sección dentro de una ficha o el contenido de una
 * pestaña; por eso NO trae el encabezado de página (eso es `ListPage`).
 *
 * **Ordenación y filtro (F-28)** salen gratis: si alguna columna declara `value`, la tabla gana cabeceras
 * ordenables y una caja de filtro. Las columnas sin `value` (acciones, controles) no participan, que es lo
 * correcto. Al vivir aquí, se implementó una vez y lo heredaron las 19 vistas — ese era el motivo de hacer
 * F-29 antes que esto.
 */
export function RecordTable<T>({
  columns,
  rows,
  getKey,
  empty,
  selectable,
  archive,
  restore,
  remove,
  fixedLayout,
  truncatedAt,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  /** Tope de la consulta que trajo estas filas: si se alcanzó, la tabla lo avisa (ver `LIST_LIMIT`). */
  truncatedAt?: number;
  /** Qué pintar cuando no hay filas. Sin esto, una lista vacía no renderiza nada. */
  empty?: { title: string; hint?: string; action?: ReactNode };
  selectable?: boolean;
  archive?: { entityType: string };
  restore?: { entityType: string };
  remove?: { entityType: string };
  fixedLayout?: boolean;
}) {
  if (rows.length === 0) {
    return empty ? <EmptyState title={empty.title} hint={empty.hint} action={empty.action} /> : null;
  }
  // Los valores planos se calculan AQUÍ, en el servidor, y viajan junto al JSX ya pintado: el cliente no puede
  // mirar dentro de un `ReactNode` para saber por qué ordenar o qué texto filtrar (ver `Column.value`).
  const anyValue = columns.some((c) => c.value);
  return (
    <DataTable
      columns={columns.map(({ header, className, value }) => ({ header, className, sortable: !!value }))}
      rows={rows.map((row) => ({
        id: getKey(row),
        cells: columns.map((c) => c.cell(row)),
        values: anyValue ? columns.map((c) => c.value?.(row) ?? null) : undefined,
      }))}
      selectable={selectable}
      archive={archive}
      restore={restore}
      remove={remove}
      fixedLayout={fixedLayout}
      filterable={anyValue}
      truncatedAt={truncatedAt}
    />
  );
}
