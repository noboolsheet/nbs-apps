import { and, eq, notInArray } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { calendarEvents, organizations } from '@ct/db/schema';
import type { CalendarSourceAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de Google Calendar → Control Tower. El worker sólo pide el rango del DÍA de hoy
 * (timeMin/timeMax en el timezone de la org), así que la caché `calendar_events` refleja exactamente los
 * eventos de hoy: se upsertan los del pull y se BORRAN los que ya no vinieron (cancelados/movidos/ayer).
 * Idempotencia vía UNIQUE(organization_id, external_id). Provider fijo GCALENDAR (referencia read-only).
 */
const P = 'GCALENDAR';

export interface SyncCalendarSummary {
  events: { upserted: number; deleted: number };
  skipped: SyncSkip[];
}

function toDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function syncCalendar(
  db: Database,
  ctx: OrgContext,
  adapter: CalendarSourceAdapter,
): Promise<SyncCalendarSummary> {
  const { events } = await adapter.pull();
  const summary: SyncCalendarSummary = { events: { upserted: 0, deleted: 0 }, skipped: [] };
  const seen: string[] = [];

  for (const ev of events) {
    // Namespacea el id por calendario: el mismo external_id podría repetirse entre calendarios distintos.
    const extId = ev.calendarId ? `${ev.calendarId}::${ev.externalId}` : ev.externalId;
    try {
      await db
        .insert(calendarEvents)
        .values({
          organizationId: ctx.organizationId,
          provider: P,
          externalId: extId,
          title: ev.title,
          location: ev.location,
          htmlLink: ev.htmlLink,
          startAt: toDate(ev.startAt),
          endAt: toDate(ev.endAt),
          isAllDay: ev.isAllDay,
          startDate: ev.startDate ?? null,
          status: ev.status,
        })
        .onConflictDoUpdate({
          target: [calendarEvents.organizationId, calendarEvents.externalId],
          set: {
            title: ev.title,
            location: ev.location,
            htmlLink: ev.htmlLink,
            startAt: toDate(ev.startAt),
            endAt: toDate(ev.endAt),
            isAllDay: ev.isAllDay,
            startDate: ev.startDate ?? null,
            status: ev.status,
            updatedAt: new Date(),
          },
        });
      seen.push(extId);
      summary.events.upserted++;
    } catch (e) {
      summary.skipped.push({ entity: 'event', externalId: extId, error: errMsg(e) });
    }
  }

  // Reconciliación: la caché sólo contiene los eventos del pull de hoy. Borra los que ya no aparecen
  // (eventos cancelados/movidos fuera del día, o los de días anteriores).
  const deleted = await db
    .delete(calendarEvents)
    .where(
      and(
        orgEq(calendarEvents.organizationId, ctx),
        eq(calendarEvents.provider, P),
        seen.length > 0 ? notInArray(calendarEvents.externalId, seen) : undefined,
      ),
    )
    .returning({ id: calendarEvents.id });
  summary.events.deleted = deleted.length;

  return summary;
}

/**
 * Rango del DÍA de hoy (00:00–24:00) en un timezone IANA, como instantes UTC. Sin librería de fechas:
 * se calcula el offset de la zona con Intl y se resta al "wall-clock" de medianoche local.
 */
export function zonedDayRange(now: Date, tz?: string | null): { dayStart: Date; dayEnd: Date; today: string } {
  const zone = tz || 'UTC';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const dayStart = zonedWallToUtc(`${today}T00:00:00`, zone);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd, today };
}

/** Convierte un "wall-clock" local (YYYY-MM-DDTHH:mm:ss) de una zona IANA a su instante UTC. */
function zonedWallToUtc(wall: string, tz: string): Date {
  const asIfUtc = new Date(`${wall}Z`);
  const offsetMs = tzOffsetMs(asIfUtc, tz);
  return new Date(asIfUtc.getTime() - offsetMs);
}

/** Offset (ms) de la zona IANA en un instante dado: (hora local formateada como UTC) − (instante real). */
function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/** Lee el timezone de la org (organizations.settings.timezone) y devuelve el rango de hoy. */
export async function resolveOrgTodayRange(
  db: Database,
  ctx: OrgContext,
  now: Date = new Date(),
): Promise<{ dayStart: Date; dayEnd: Date; today: string }> {
  const [orgRow] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId));
  const tz = (orgRow?.settings as { timezone?: string } | null)?.timezone;
  return zonedDayRange(now, tz);
}
