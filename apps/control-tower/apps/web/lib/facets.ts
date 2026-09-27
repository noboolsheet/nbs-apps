/**
 * **Facetas de lista**: filtros por valor exacto sobre una columna de conjunto cerrado (Estado, Prioridad, Tipo,
 * Cliente…). Lógica pura, aparte del componente, para poder probarla.
 *
 * Por qué facetas y no «un filtro por columna»: de las ~122 columnas de la app sólo unas 45 son conjuntos cerrados;
 * en nombres, fechas, importes y enlaces un desplegable no aporta nada (para eso está el buscador de texto) y seis
 * selects sobre una tabla de seis columnas empujan la tabla fuera de la pantalla.
 *
 * Reglas que implementa:
 *  - Las **opciones se derivan de las filas cargadas**, no de un enum declarado: así vale igual para texto libre de
 *    baja cardinalidad (sector, industria) y nunca se ofrece un valor que no existe en la lista.
 *  - Los **contadores** se calculan sobre las filas que pasan las OTRAS facetas y el texto, que es lo que hace que
 *    el número de cada opción sea el que vas a obtener al elegirla.
 *  - Una columna con **un solo valor distinto** no se ofrece: filtrar por ella no cambiaría nada.
 */
export type CellValue = string | number | Date | null | undefined;
export interface FacetableRow {
  values?: CellValue[];
}
/** Faceta activa: índice de columna → valor exacto seleccionado (ausente = «todos»). */
export type FacetSelection = Record<number, string>;

/** Texto plano de una celda para comparar/mostrar. Las fechas se formatean con el formateador de la app. */
export function cellText(v: CellValue, formatDate: (d: Date) => string): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return formatDate(v);
  return String(v);
}

/** ¿La fila pasa TODAS las facetas activas? (se combinan con Y). `except` deja una fuera, para sus contadores. */
export function matchesFacets(
  row: FacetableRow,
  selection: FacetSelection,
  formatDate: (d: Date) => string,
  except?: number,
): boolean {
  for (const [key, expected] of Object.entries(selection)) {
    const index = Number(key);
    if (!expected || index === except) continue;
    if (cellText(row.values?.[index], formatDate) !== expected) return false;
  }
  return true;
}

export interface FacetChoice {
  value: string;
  count: number;
}

/**
 * Opciones de una faceta con su recuento, en orden alfabético (el que hace que se encuentren de un vistazo).
 * `rows` son las filas ya filtradas por el texto; las otras facetas se aplican aquí.
 */
export function facetChoices(
  rows: FacetableRow[],
  index: number,
  selection: FacetSelection,
  formatDate: (d: Date) => string,
): FacetChoice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!matchesFacets(row, selection, formatDate, index)) continue;
    const text = cellText(row.values?.[index], formatDate);
    if (text === '') continue; // «sin valor» no es una opción: no se filtra por un hueco
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, 'es', { numeric: true, sensitivity: 'base' }));
}

/**
 * ¿Merece la pena ofrecer esta faceta? Hacen falta **dos valores distintos** entre TODAS las filas cargadas: con
 * uno solo, el desplegable no filtraría nada y sólo ocuparía sitio.
 */
export function facetIsUseful(rows: FacetableRow[], index: number, formatDate: (d: Date) => string): boolean {
  const seen = new Set<string>();
  for (const row of rows) {
    const text = cellText(row.values?.[index], formatDate);
    if (text !== '') seen.add(text);
    if (seen.size > 1) return true;
  }
  return false;
}

/** Limpia las facetas cuyo valor ya no existe en las filas (tras un refresco del servidor dejarían la lista vacía). */
export function pruneSelection(
  rows: FacetableRow[],
  selection: FacetSelection,
  formatDate: (d: Date) => string,
): FacetSelection {
  const next: FacetSelection = {};
  for (const [key, expected] of Object.entries(selection)) {
    if (!expected) continue;
    const index = Number(key);
    if (rows.some((r) => cellText(r.values?.[index], formatDate) === expected)) next[index] = expected;
  }
  return next;
}
