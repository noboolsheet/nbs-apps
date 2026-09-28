import { describe, it, expect } from 'vitest';
import { TAX_RESERVE_PCT, taxReserve } from './tax-reserve';

describe('reserva de impuestos', () => {
  it('aparta el 30% de lo que te deben', () => {
    expect(TAX_RESERVE_PCT).toBe(30);
    expect(taxReserve(1000)).toBe(300);
  });

  it('acepta otro porcentaje (el día que dependa del régimen, vendrá de Ajustes)', () => {
    expect(taxReserve(1000, 21)).toBe(210);
  });

  it('sin nada pendiente no hay nada que apartar (ni números raros)', () => {
    expect(taxReserve(0)).toBe(0);
    expect(taxReserve(-50)).toBe(0);
    expect(taxReserve(Number.NaN)).toBe(0);
  });
});
