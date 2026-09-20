import type { CalendarSourceAdapter, HealthResult, CalendarPullResult } from '../types';
import type { CalendarDataSource } from './client';
import { mapCalendarEvent } from './mapper';

/** Adapter de Google Calendar: pull de eventos → referencias read-only (se cachean como calendar_events). */
export class CalendarAdapter implements CalendarSourceAdapter {
  readonly provider = 'GCALENDAR';
  constructor(private readonly source: CalendarDataSource) {}

  async healthCheck(): Promise<HealthResult> {
    try {
      const ok = await this.source.ping();
      return ok ? { status: 'HEALTHY' } : { status: 'ERROR', message: 'ping failed' };
    } catch (e) {
      return { status: 'ERROR', message: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  async pull(): Promise<CalendarPullResult> {
    const events = await this.source.events();
    return { events: events.map(mapCalendarEvent) };
  }
}
