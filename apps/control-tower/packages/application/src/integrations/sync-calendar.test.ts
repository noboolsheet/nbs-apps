import { describe, it, expect } from 'vitest';
import { zonedDayRange } from './sync-calendar';

describe('zonedDayRange', () => {
  it('UTC: límites del día en curso', () => {
    const now = new Date('2026-08-13T18:00:00Z');
    const { dayStart, dayEnd, today } = zonedDayRange(now, 'UTC');
    expect(today).toBe('2026-08-13');
    expect(dayStart.toISOString()).toBe('2026-08-13T00:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-08-14T00:00:00.000Z');
  });

  it('America/New_York (EDT, verano): medianoche local = 04:00Z', () => {
    const now = new Date('2026-08-13T18:00:00Z'); // 14:00 en NY
    const { dayStart, dayEnd, today } = zonedDayRange(now, 'America/New_York');
    expect(today).toBe('2026-08-13');
    expect(dayStart.toISOString()).toBe('2026-08-13T04:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-08-14T04:00:00.000Z');
  });

  it('America/Los_Angeles: cruce de día (instante que aún es "ayer" local)', () => {
    const now = new Date('2026-08-13T02:00:00Z'); // 19:00 del 12 en LA (PDT, UTC-7)
    const { dayStart, today } = zonedDayRange(now, 'America/Los_Angeles');
    expect(today).toBe('2026-08-12');
    expect(dayStart.toISOString()).toBe('2026-08-12T07:00:00.000Z');
  });

  it('tz nula → UTC', () => {
    const now = new Date('2026-08-13T18:00:00Z');
    const { today } = zonedDayRange(now, null);
    expect(today).toBe('2026-08-13');
  });
});
