import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './format';

/** El formato de fecha es día/mes/año (el bug: en un navegador en inglés salía 12/31/2026). */
describe('formato de fechas', () => {
  it('formatea día/mes/año', () => {
    expect(formatDate(new Date(Date.UTC(2026, 11, 31, 12, 0)))).toBe('31/12/2026');
  });

  it('una fecha de sólo día NO se desplaza por el huso horario', () => {
    // `new Date('2026-01-01')` es medianoche UTC: al oeste de Greenwich caería en el 31/12. Se reordena el literal.
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
  });

  it('vacío y valores inválidos dan raya, no "Invalid Date"', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('no es fecha')).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });

  it('la fecha con hora incluye día/mes/año', () => {
    expect(formatDateTime(new Date(Date.UTC(2026, 11, 31, 12, 0)))).toMatch(/^31\/12\/2026/);
  });
});
