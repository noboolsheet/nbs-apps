import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  index,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inValues, searchVector } from './_shared';
import { organizations } from './organizations';
import { CAPABILITY_STATUS, CAPABILITY_MATURITY, SERVICE_STATUS } from './enums';

// doc 5 §8 — strategic_areas
export const strategicAreas = pgTable(
  'strategic_areas',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [index('strategic_areas_org_idx').on(t.organizationId)],
);

// doc 5 §9 — goals (self-ref parent_goal_id → jerarquía)
export const goals = pgTable(
  'goals',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    strategicAreaId: uuid('strategic_area_id').references(() => strategicAreas.id),
    parentGoalId: uuid('parent_goal_id').references((): AnyPgColumn => goals.id),
    name: varchar('name').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    priority: varchar('priority').notNull(),
    targetDate: timestamp('target_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [
    index('goals_org_idx').on(t.organizationId),
    index('goals_strategic_area_idx').on(t.strategicAreaId),
  ],
);

// doc 5 §10 — capabilities
export const capabilities = pgTable(
  'capabilities',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    maturity: varchar('maturity').notNull(),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'description', 'notes'),
  },
  (t) => [
    index('capabilities_org_idx').on(t.organizationId),
    index('capabilities_search_idx').using('gin', t.searchVector),
    inValues('capabilities_status_check', t.status, CAPABILITY_STATUS),
    inValues('capabilities_maturity_check', t.maturity, CAPABILITY_MATURITY),
  ],
);

// doc 5 §11 — services
export const services = pgTable(
  'services',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    slug: varchar('slug').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    serviceType: varchar('service_type'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'description', 'notes'),
  },
  (t) => [
    unique('services_org_slug_unique').on(t.organizationId, t.slug),
    index('services_org_idx').on(t.organizationId),
    index('services_search_idx').using('gin', t.searchVector),
    inValues('services_status_check', t.status, SERVICE_STATUS),
  ],
);

// doc 5 §12 — service_capabilities (N:M, PK compuesta)
export const serviceCapabilities = pgTable(
  'service_capabilities',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    capabilityId: uuid('capability_id')
      .notNull()
      .references(() => capabilities.id),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.serviceId, t.capabilityId] }),
    index('service_capabilities_capability_idx').on(t.capabilityId),
  ],
);
