import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  jsonb,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt } from './_shared';
import { organizations } from './organizations';

/**
 * calendar_events — espejo READ-ONLY de eventos de calendario externos (Google Calendar, provider='GCALENDAR').
 * A diferencia de Drive (que mapea a `documents` vía external_identities), un evento no representa otra entidad
 * de CT: es su propia entidad externa. Idempotencia por `UNIQUE(organization_id, external_id)` (upsert on-conflict).
 * Secretos y credenciales NUNCA aquí (van a env). Eventos con hora usan `start_at`/`end_at`; los de día completo
 * usan `is_all_day=true` + `start_date` (Google los entrega como `start.date` sin hora).
 */
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    provider: varchar('provider').notNull(),
    externalId: varchar('external_id').notNull(),
    title: text('title'),
    location: text('location'),
    htmlLink: text('html_link'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    isAllDay: boolean('is_all_day').notNull().default(false),
    startDate: date('start_date'),
    status: varchar('status'),
    raw: jsonb('raw'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('calendar_events_org_extid_unique').on(t.organizationId, t.externalId),
    index('calendar_events_org_idx').on(t.organizationId),
    index('calendar_events_org_start_idx').on(t.organizationId, t.startAt),
  ],
);
