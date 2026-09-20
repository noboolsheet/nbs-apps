import { describe, it, expect } from 'vitest';
import { mapCalendarEvent } from './mapper';

describe('gcalendar mapper', () => {
  it('mapea evento con hora (dateTime)', () => {
    const e = mapCalendarEvent({
      id: 'e1',
      summary: 'Reunión con cliente',
      location: 'Meet',
      htmlLink: 'https://calendar.google.com/event?eid=e1',
      status: 'confirmed',
      start: { dateTime: '2026-08-13T10:00:00+02:00' },
      end: { dateTime: '2026-08-13T11:00:00+02:00' },
    });
    expect(e).toMatchObject({
      externalId: 'e1',
      title: 'Reunión con cliente',
      location: 'Meet',
      htmlLink: 'https://calendar.google.com/event?eid=e1',
      isAllDay: false,
      startAt: '2026-08-13T10:00:00+02:00',
      endAt: '2026-08-13T11:00:00+02:00',
      status: 'confirmed',
    });
    expect(e.startDate).toBeUndefined();
  });

  it('mapea evento de día completo (date)', () => {
    const e = mapCalendarEvent({ id: 'e2', summary: 'Festivo', start: { date: '2026-08-13' }, end: { date: '2026-08-14' } });
    expect(e).toMatchObject({ externalId: 'e2', title: 'Festivo', isAllDay: true, startDate: '2026-08-13' });
    expect(e.startAt).toBeUndefined();
    expect(e.endAt).toBeUndefined();
  });

  it('propaga el calendario de origen (multi-calendario)', () => {
    const e = mapCalendarEvent({ id: 'e4', summary: 'Reunión', start: { dateTime: '2026-08-13T10:00:00Z' }, __sourceCalendarId: 'trabajo@grupo.calendar.google.com' });
    expect(e.calendarId).toBe('trabajo@grupo.calendar.google.com');
  });

  it('fallback de título', () => {
    const e = mapCalendarEvent({ id: 'e3', start: { dateTime: '2026-08-13T09:00:00Z' } });
    expect(e.title).toBe('(sin título)');
    expect(e.isAllDay).toBe(false);
  });
});
