'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';
import { btnPrimary } from './button';
import { fieldCls } from './input';
import { t, tPlural } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

/**
 * Tabla de entidades con columnas alineadas (`<table>`, como `EntityTable`) + selección múltiple opcional
 * (checkbox por fila + "seleccionar todo") y una barra de acciones en lote (de momento: **Archivar**).
 *
 * Es un CLIENT component (mantiene el estado de selección). Por eso NO recibe funciones `cell` (no serializables
 * a través del límite servidor→cliente): el server las prerenderiza y pasa las celdas ya como `ReactNode`
 * (`rows[].cells`).
 *
 * **No lo uses directamente desde una vista:** usa `<RecordTable>` (`record-table.tsx`), que hace ese mapeo
 * desde `Column<T>` y añade el estado vacío. Hacerlo a mano era exactamente el boilerplate que se repetía en
 * 17 vistas (F-29). Este componente es la pieza de bajo nivel.
 */
export interface DataTableColumn {
  header: string;
  className?: string;
  /** La columna es ordenable (su `Column.value` existe). Lo decide `RecordTable`, no la vista. */
  sortable?: boolean;
}
export interface DataTableRow {
  id: string;
  cells: ReactNode[];
  className?: string;
  /**
   * Valores planos por columna (F-28), en el mismo orden que `cells`. El servidor los manda junto al JSX ya
   * pintado porque el cliente no puede mirar dentro de un `ReactNode`. Se usan para ordenar y para filtrar.
   */
  values?: (string | number | Date | null | undefined)[];
}

/** Compara dos valores de celda: números como números, textos con `localeCompare` (acentos y ñ en su sitio). */
function compareValues(a: unknown, b: unknown): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  // Los vacíos siempre al final, suba o baje el orden: "sin fecha" no es ni lo primero ni lo último útil.
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  // Las fechas se comparan como instantes, no como su texto: "10/03" iría antes que "9/03" alfabéticamente.
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

export function DataTable({
  columns,
  rows,
  selectable = false,
  archive,
  restore,
  remove,
  fixedLayout = false,
  filterable = false,
  truncatedAt,
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  /** Muestra el filtro rápido sobre la tabla. Lo activa `RecordTable` cuando alguna columna aporta `value`. */
  filterable?: boolean;
  /** Si la consulta tocó su tope, el número; se avisa al usuario en vez de mentirle con una lista recortada. */
  truncatedAt?: number;
  selectable?: boolean;
  /** Habilita "Archivar" en la barra de selección. `entityType` = clave de la allowlist del endpoint /archive. */
  archive?: { entityType: string };
  /** Habilita "Restaurar" (para la vista de archivados). Mutuamente excluyente con `archive`. */
  restore?: { entityType: string };
  /** Habilita "Borrar" (definitivo) en la barra de selección. Mutuamente excluyente con archive/restore. */
  remove?: { entityType: string };
  /** `table-fixed`: anchos de columna estables e idénticos entre varias tablas apiladas (usar anchos en `columns[].className`). */
  fixedLayout?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ index: number; dir: 'asc' | 'desc' } | null>(null);
  const headerRef = useRef<HTMLInputElement>(null);

  // Filtro + orden en CLIENTE, a propósito: no hay paginación, así que el servidor ya mandó todas las filas.
  // Hacerlo por URL obligaría a un viaje de ida y vuelta por cada clic — en la Pi eso se nota, y aquí no aporta.
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter((r) =>
        (r.values ?? []).some((v) => {
          if (v == null) return false;
          // Una fecha se filtra por su forma legible (día/mes/año), que es como el usuario la ve.
          const text = v instanceof Date ? formatDate(v) : String(v);
          return text.toLowerCase().includes(q);
        }),
      );
    }
    if (sort) {
      // copia: `Array.sort` muta, y `rows` viene del render del servidor.
      out = [...out].sort((a, b) => {
        const cmp = compareValues(a.values?.[sort.index], b.values?.[sort.index]);
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, sort]);

  function toggleSort(index: number) {
    setSort((prev) =>
      prev?.index === index ? (prev.dir === 'asc' ? { index, dir: 'desc' } : null) : { index, dir: 'asc' },
    );
  }

  const keys = visibleRows.map((r) => r.id);
  const selectedIds = keys.filter((k) => selected.has(k)); // solo los que siguen en la vista
  const allSelected = keys.length > 0 && selectedIds.length === keys.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(keys));
  }
  function toggleOne(k: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  // Acción en lote: archivar (por defecto), restaurar (vista de archivados) o borrar (definitivo, p. ej. tareas).
  const action = archive
    ? {
        entityType: archive.entityType,
        endpoint: '/api/v1/archive',
        verb: t('common.archive'),
        busyVerb: t('common.archiving'),
        confirmMsg: (n: number) => tPlural('table.confirmArchive', n),
      }
    : restore
      ? {
          entityType: restore.entityType,
          endpoint: '/api/v1/restore',
          verb: t('common.restore'),
          busyVerb: t('common.restoring'),
          confirmMsg: (n: number) => tPlural('table.confirmRestore', n),
        }
      : remove
        ? {
            entityType: remove.entityType,
            endpoint: '/api/v1/delete',
            verb: t('common.delete'),
            busyVerb: t('common.deleting'),
            confirmMsg: (n: number) => tPlural('table.confirmDelete', n),
          }
        : null;

  async function doAction() {
    if (!action || selectedIds.length === 0) return;
    if (!confirm(action.confirmMsg(selectedIds.length))) return;
    setBusy(true);
    setError(null);
    const res = await postJson(action.endpoint, { entityType: action.entityType, ids: selectedIds });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  const checkboxCls = 'h-4 w-4 cursor-pointer accent-primary';

  return (
    <div className="flex flex-col gap-2">
      {selectable && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-strong bg-surface-muted px-3 py-2 text-sm">
          <span className="font-medium">{tPlural('table.selected', selectedIds.length)}</span>
          {action && (
            <button type="button" onClick={() => void doAction()} disabled={busy} className={btnPrimary}>
              {busy ? action.busyVerb : action.verb}
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="text-fg-muted underline">
            {t('table.clearSelection')}
          </button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      )}

      {filterable && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('table.filterPlaceholder')}
            aria-label={t('table.filterPlaceholder')}
            className={`w-56 ${fieldCls}`}
          />
          {query && (
            <span className="text-xs text-fg-muted">
              {tPlural('table.filterMatches', visibleRows.length)}
            </span>
          )}
        </div>
      )}

      {truncatedAt !== undefined && rows.length >= truncatedAt && (
        <p className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-fg">
          {t('table.truncated', { n: truncatedAt })}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className={`w-full border-collapse text-sm ${fixedLayout ? 'table-fixed min-w-[880px]' : ''}`}>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-muted">
              {selectable && (
                <th className="w-9 px-3 py-2">
                  <input
                    ref={headerRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={t('table.selectAll')}
                    className={checkboxCls}
                  />
                </th>
              )}
              {columns.map((c, i) => {
                const active = sort?.index === i;
                if (!c.sortable) {
                  return (
                    <th key={c.header} className={`px-3 py-2 font-medium ${c.className ?? ''}`}>
                      {c.header}
                    </th>
                  );
                }
                return (
                  <th
                    key={c.header}
                    // `aria-sort` es lo que hace que un lector de pantalla anuncie el orden actual.
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`px-3 py-2 font-medium ${c.className ?? ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(i)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-fg"
                    >
                      {c.header}
                      <span aria-hidden className={active ? 'text-fg' : 'text-fg-subtle opacity-0 group-hover:opacity-100'}>
                        {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const sel = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  className={`border-b border-line-subtle last:border-0 ${
                    sel ? 'bg-row-selected' : 'hover:bg-surface-muted/40'
                  } ${row.className ?? ''}`}
                >
                  {selectable && (
                    <td className="w-9 px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggleOne(row.id)}
                        aria-label={t('table.selectRow')}
                        className={checkboxCls}
                      />
                    </td>
                  )}
                  {row.cells.map((cell, i) => (
                    <td key={columns[i]?.header ?? i} className={`px-3 py-2 align-middle ${columns[i]?.className ?? ''}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-fg-muted">{t('table.noMatches')}</p>
        )}
      </div>
    </div>
  );
}
