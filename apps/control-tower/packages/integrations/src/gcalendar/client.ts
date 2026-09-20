/**
 * Fuente de datos de Google Calendar. Interfaz inyectable (fixture en tests). La implementación HTTP
 * usa la API Calendar v3 (events.list) con `singleEvents=true` (expande recurrentes) sobre un rango
 * [timeMin, timeMax]. Soporta VARIOS calendarios (los recorre y agrega, marcando cada evento con su
 * calendario de origen). Sólo lectura; auth por cuenta de servicio (mismo token que Drive, scope calendar.readonly).
 */
import { withTimeout } from '../http';

export type CalendarRawEvent = { id: string; [key: string]: unknown };

export interface CalendarDataSource {
  ping(): Promise<boolean>;
  events(): Promise<CalendarRawEvent[]>;
}

export interface CalendarHttpConfig {
  /** Token estático (compat/dev; caduca ~1h). */
  accessToken?: string;
  /** Proveedor de token (cuenta de servicio): recomendado, sin caducidad problemática. */
  getToken?: () => Promise<string>;
  /** IDs/emails de los calendarios a leer (todos compartidos con la service account). */
  calendarIds: string[];
  /** Límites del rango a traer (por defecto, el día de hoy calculado por el caller). ISO 8601. */
  timeMin: string;
  timeMax: string;
  baseUrl?: string; // default https://www.googleapis.com
  fetchImpl?: typeof fetch;
}

export class HttpCalendarDataSource implements CalendarDataSource {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly getTokenFn?: () => Promise<string>;
  private readonly calendarIds: string[];
  private readonly timeMin: string;
  private readonly timeMax: string;
  private readonly f: typeof fetch;

  constructor(config: CalendarHttpConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://www.googleapis.com').replace(/\/$/, '');
    this.accessToken = config.accessToken;
    this.getTokenFn = config.getToken;
    this.calendarIds = config.calendarIds;
    this.timeMin = config.timeMin;
    this.timeMax = config.timeMax;
    this.f = withTimeout(config.fetchImpl ?? fetch);
  }

  private async token(): Promise<string> {
    if (this.getTokenFn) return this.getTokenFn();
    if (this.accessToken) return this.accessToken;
    throw new Error('Calendar: falta getToken o accessToken');
  }

  private async headers(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.token()}`, Accept: 'application/json' };
  }

  private eventsPath(calendarId: string): string {
    return `${this.baseUrl}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  }

  async ping(): Promise<boolean> {
    const calendarId = this.calendarIds[0];
    if (!calendarId) return false;
    try {
      const params = new URLSearchParams({ maxResults: '1', timeMin: this.timeMin, timeMax: this.timeMax });
      const res = await this.f(`${this.eventsPath(calendarId)}?${params.toString()}`, { headers: await this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  async events(): Promise<CalendarRawEvent[]> {
    const headers = await this.headers();
    const out: CalendarRawEvent[] = [];
    for (const calendarId of this.calendarIds) {
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          maxResults: '250',
          singleEvents: 'true',
          orderBy: 'startTime',
          showDeleted: 'false',
          timeMin: this.timeMin,
          timeMax: this.timeMax,
        });
        if (pageToken) params.set('pageToken', pageToken);
        const res = await this.f(`${this.eventsPath(calendarId)}?${params.toString()}`, { headers });
        if (!res.ok) throw new Error(`Calendar events (${calendarId}) → HTTP ${res.status}`);
        const json = (await res.json()) as { items?: CalendarRawEvent[]; nextPageToken?: string };
        // Marca cada evento con su calendario de origen (para agregar varios sin colisión de IDs).
        for (const it of json.items ?? []) out.push({ ...it, __sourceCalendarId: calendarId });
        pageToken = json.nextPageToken;
      } while (pageToken);
    }
    return out;
  }
}
