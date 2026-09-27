import { describe, it, expect } from 'vitest';
import { cellText, facetChoices, facetIsUseful, matchesFacets, pruneSelection } from './facets';

const fmt = (d: Date) => d.toISOString().slice(0, 10);
/** Columnas: 0 = nombre, 1 = estado, 2 = prioridad. */
const rows = [
  { values: ['Alfa', 'Activo', 'Alta'] },
  { values: ['Beta', 'Bloqueado', 'Alta'] },
  { values: ['Gamma', 'Activo', 'Baja'] },
  { values: ['Delta', 'Activo', null] },
];

describe('facetas de lista', () => {
  it('las opciones salen de los datos, ordenadas y con su recuento', () => {
    expect(facetChoices(rows, 1, {}, fmt)).toEqual([
      { value: 'Activo', count: 3 },
      { value: 'Bloqueado', count: 1 },
    ]);
  });

  it('el recuento de una faceta respeta las OTRAS facetas activas', () => {
    // Con prioridad=Alta, «Activo» ya sólo tiene una fila: el número que ves es el que vas a obtener.
    expect(facetChoices(rows, 1, { 2: 'Alta' }, fmt)).toEqual([
      { value: 'Activo', count: 1 },
      { value: 'Bloqueado', count: 1 },
    ]);
  });

  it('una faceta NO se cuenta a sí misma (si no, al elegir un valor desaparecerían los demás)', () => {
    expect(facetChoices(rows, 1, { 1: 'Bloqueado' }, fmt).map((c) => c.value)).toEqual(['Activo', 'Bloqueado']);
  });

  it('las facetas activas se combinan con Y', () => {
    const row = rows[0]!;
    expect(matchesFacets(row, { 1: 'Activo', 2: 'Alta' }, fmt)).toBe(true);
    expect(matchesFacets(row, { 1: 'Activo', 2: 'Baja' }, fmt)).toBe(false);
    expect(matchesFacets(row, {}, fmt)).toBe(true);
  });

  it('el hueco no es una opción de filtro', () => {
    // La fila «Delta» no tiene prioridad: no aparece como opción «—», que no querría decir nada.
    expect(facetChoices(rows, 2, {}, fmt).map((c) => c.value)).toEqual(['Alta', 'Baja']);
  });

  it('una columna con un solo valor no se ofrece como faceta', () => {
    expect(facetIsUseful(rows, 1, fmt)).toBe(true);
    expect(facetIsUseful([{ values: ['x', 'Activo'] }, { values: ['y', 'Activo'] }], 1, fmt)).toBe(false);
    expect(facetIsUseful([], 1, fmt)).toBe(false);
  });

  it('una selección que ya no existe en los datos se descarta', () => {
    // Tras un refresco del servidor, una faceta fantasma dejaría la lista vacía sin motivo visible.
    expect(pruneSelection(rows, { 1: 'Retirado', 2: 'Alta' }, fmt)).toEqual({ 2: 'Alta' });
  });

  it('las fechas se comparan por su texto formateado, como se ven', () => {
    const d = new Date('2026-09-27T10:00:00Z');
    expect(cellText(d, fmt)).toBe('2026-09-27');
    expect(matchesFacets({ values: [d] }, { 0: '2026-09-27' }, fmt)).toBe(true);
  });
});
