import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  char,
  date,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inValues, searchVector } from './_shared';
import { organizations } from './organizations';
import { OPPORTUNITY_STAGE, OPPORTUNITY_STATUS, PAYMENT_DIRECTION, PAYMENT_STATUS } from './enums';

// doc 5 §13 — clients (entidad propia; Twenty = SoT del CRM, CT = proyección/contexto)
export const clients = pgTable(
  'clients',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    slug: varchar('slug').notNull(),
    status: varchar('status').notNull(),
    industry: varchar('industry'),
    websiteUrl: text('website_url'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'industry', 'notes'),
  },
  (t) => [
    unique('clients_org_slug_unique').on(t.organizationId, t.slug),
    index('clients_org_idx').on(t.organizationId),
    index('clients_status_idx').on(t.status),
    index('clients_search_idx').using('gin', t.searchVector),
  ],
);

// doc 5 §14 — contacts (email NO único globalmente)
export const contacts = pgTable(
  'contacts',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id').references(() => clients.id),
    firstName: varchar('first_name'),
    lastName: varchar('last_name'),
    email: varchar('email'),
    phone: varchar('phone'),
    jobTitle: varchar('job_title'),
    status: varchar('status').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('first_name', 'last_name', 'email', 'job_title'),
  },
  (t) => [
    index('contacts_org_idx').on(t.organizationId),
    index('contacts_client_id').on(t.clientId),
    index('contacts_email').on(t.email),
    index('contacts_search_idx').using('gin', t.searchVector),
  ],
);

// doc 5 §15 — opportunities (ADR-002: stage 8 estados + status OPEN/WON/LOST)
export const opportunities = pgTable(
  'opportunities',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id').references(() => clients.id),
    primaryContactId: uuid('primary_contact_id').references(() => contacts.id),
    name: varchar('name').notNull(),
    stage: varchar('stage').notNull(),
    status: varchar('status').notNull(),
    estimatedValue: numeric('estimated_value', { precision: 14, scale: 2 }),
    currencyCode: char('currency_code', { length: 3 }),
    expectedCloseDate: date('expected_close_date'),
    source: varchar('source'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'source', 'notes'),
  },
  (t) => [
    index('opportunities_org_idx').on(t.organizationId),
    index('opportunities_client_id').on(t.clientId),
    index('opportunities_search_idx').using('gin', t.searchVector),
    inValues('opportunities_stage_check', t.stage, OPPORTUNITY_STAGE),
    inValues('opportunities_status_check', t.status, OPPORTUNITY_STATUS),
  ],
);

/**
 * Pagos (sección **Pagos**). Registro simple de dinero **pendiente de entrar o de salir**: facturas que te deben,
 * cobros ya planificados y pagos que tienes que hacer tú.
 *
 * `direction` decide de quién es el pago: **IN** (te lo deben) puede apuntar a un `client_id` o a un `contact_id` del
 * CRM; **OUT** (lo debes tú) lleva `payee_label`, una etiqueta libre — el destinatario de un gasto (una suscripción, un
 * proveedor) no tiene por qué existir como cliente. La combinación la valida el comando, no la tabla, porque un pago
 * puede quedarse a medias mientras se rellena desde el panel.
 *
 * Es CT-nativo: no se refleja a Notion ni a Twenty.
 */
export const payments = pgTable(
  'payments',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    /** Qué es este pago: "Factura marzo", "Suscripción Figma"… */
    concept: varchar('concept').notNull(),
    direction: varchar('direction').notNull(),
    status: varchar('status').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    /** ISO-4217. Por defecto EUR (decisión del owner); el selector ofrece el resto. */
    currencyCode: char('currency_code', { length: 3 }).notNull().default('EUR'),
    /** Sólo en IN: a quién se lo cobras (uno de los dos, o ninguno si aún no se sabe). */
    clientId: uuid('client_id').references(() => clients.id),
    contactId: uuid('contact_id').references(() => contacts.id),
    /** Sólo en OUT: a quién le pagas (texto libre). */
    payeeLabel: varchar('payee_label'),
    /** Cuándo toca cobrarlo/pagarlo (para ver lo que vence). */
    dueDate: date('due_date'),
    /** Se rellena solo al marcarlo como pagado. */
    paidAt: timestamp('paid_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('concept', 'payee_label'),
  },
  (t) => [
    index('payments_org_status_idx').on(t.organizationId, t.status),
    index('payments_client_idx').on(t.clientId),
    index('payments_search_idx').using('gin', t.searchVector),
    inValues('payments_direction_check', t.direction, PAYMENT_DIRECTION),
    inValues('payments_status_check', t.status, PAYMENT_STATUS),
  ],
);
