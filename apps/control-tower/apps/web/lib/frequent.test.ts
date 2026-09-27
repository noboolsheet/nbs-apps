import { describe, it, expect } from 'vitest';
import {
  rankFrequent,
  registerVisit,
  relabel,
  scoreEntry,
  topFrequent,
  type FrequentEntry,
} from './frequent';

const DAY = 86_400_000;
const now = Date.parse('2026-09-27T12:00:00Z');
const entry = (path: string, count: number, daysAgo: number): FrequentEntry => ({
  path,
  label: path.toUpperCase(),
  count,
  last: now - daysAgo * DAY,
});

describe('«Más usados»', () => {
  it('lo reciente pesa más que lo muy visitado hace tiempo', () => {
    // Éste era el defecto: ordenando por visitas totales, el proyecto que cerraste hace dos meses se quedaba
    // arriba para siempre y el de esta semana no subía nunca.
    const viejo = entry('/projects/viejo', 40, 90); // 40 visitas, hace 3 meses
    const actual = entry('/projects/actual', 6, 1); // 6 visitas, ayer
    expect(rankFrequent([viejo, actual], now).map((e) => e.path)).toEqual([
      '/projects/actual',
      '/projects/viejo',
    ]);
    expect(scoreEntry(actual, now)).toBeGreaterThan(scoreEntry(viejo, now));
  });

  it('a igualdad de antigüedad, manda el número de visitas', () => {
    const a = entry('/a', 2, 3);
    const b = entry('/b', 9, 3);
    expect(rankFrequent([a, b], now).map((e) => e.path)).toEqual(['/b', '/a']);
  });

  it('olvida lo que no se visita desde hace meses', () => {
    const fosil = entry('/fosil', 99, 200);
    expect(rankFrequent([fosil, entry('/vivo', 1, 0)], now).map((e) => e.path)).toEqual(['/vivo']);
  });

  it('registrar una visita suma y actualiza la fecha, sin duplicar la entrada', () => {
    let list = registerVisit([], '/projects/x', 'Proyecto X', now - DAY);
    list = registerVisit(list, '/projects/x', 'Proyecto X', now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ count: 2, label: 'Proyecto X', last: now });
  });

  it('nunca degrada una etiqueta buena a la ruta cruda', () => {
    // Pasaba de verdad: si la página tardaba en pintar, se guardaba `/projects/<uuid>` encima del nombre real.
    let list = registerVisit([], '/projects/x', 'Proyecto X', now - DAY);
    list = registerVisit(list, '/projects/x', '/projects/x', now);
    expect(list[0]!.label).toBe('Proyecto X');
    expect(relabel(list, '/projects/x', '/projects/x')[0]!.label).toBe('Proyecto X');
    expect(relabel(list, '/projects/x', 'Proyecto X v2')[0]!.label).toBe('Proyecto X v2');
  });

  it('no se enseña nada hasta volver una segunda vez', () => {
    const unaVez = registerVisit([], '/projects/x', 'X', now);
    expect(topFrequent(unaVez, now, 4)).toEqual([]);
    const dosVeces = registerVisit(unaVez, '/projects/x', 'X', now);
    expect(topFrequent(dosVeces, now, 4).map((e) => e.path)).toEqual(['/projects/x']);
  });
});
