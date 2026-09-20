import type { CalendarRawEvent } from './client';
import type { NormalizedCalendarEvent } from '../types';

/** Mapea un evento crudo de Google Calendar a una referencia normalizada. Defensivo. */
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

/** Extremo (start/end) de Google: `{ dateTime }` (con hora) o `{ date }` (día completo). */
function edge(v: unknown): { dateTime?: string; date?: string } {
  return (v ?? {}) as { dateTime?: string; date?: string };
}

export function mapCalendarEvent(raw: CalendarRawEvent): NormalizedCalendarEvent {
  const start = edge(raw.start);
  const end = edge(raw.end);
  const allDay = !start.dateTime && !!start.date;
  return {
    externalId: raw.id,
    calendarId: str(raw.__sourceCalendarId),
    title: str(raw.summary) ?? '(sin título)',
    location: str(raw.location),
    htmlLink: str(raw.htmlLink),
    isAllDay: allDay,
    startAt: allDay ? undefined : str(start.dateTime),
    endAt: allDay ? undefined : str(end.dateTime),
    startDate: allDay ? str(start.date) : undefined,
    status: str(raw.status),
  };
}
