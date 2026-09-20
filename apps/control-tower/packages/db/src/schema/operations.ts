import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  boolean,
  unique,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inValues, searchVector } from './_shared';
import { organizations, users } from './organizations';
import { clients, contacts, opportunities } from './crm';
import { services } from './governance';
import { PROJECT_STATUS, PROJECT_TYPE, TASK_STATUS, DELIVERABLE_STATUS, RESOURCE_STATUS, RESOURCE_HOSTING } from './enums';

// doc 5 §16 — projects. current_phase_id es FK diferida a project_phases (dep. circular):
// drizzle-kit emite las FKs como ALTER tras crear ambas tablas.
export const projects = pgTable(
  'projects',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id').references(() => clients.id),
    // Un proyecto puede asociarse a un cliente (empresa) O a un contacto (persona) — ambos opcionales.
    contactId: uuid('contact_id').references(() => contacts.id),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id),
    serviceId: uuid('service_id').references(() => services.id),
    // Proyecto "personal": lo desarrolla el owner para sí mismo (sin cliente/contacto). Etiqueta libre.
    personal: boolean('personal').notNull().default(false),
    name: varchar('name').notNull(),
    slug: varchar('slug').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    // A-1 (ADR-005): tipo de proyecto. CLIENT exige client_id (invariante en el comando, no CHECK:
    // client_id sigue siendo nullable porque INTERNAL/LAB no lo llevan).
    type: varchar('type').notNull().default('INTERNAL'),
    priority: varchar('priority').notNull(),
    currentPhaseId: uuid('current_phase_id').references((): AnyPgColumn => projectPhases.id),
    startDate: date('start_date'),
    targetDate: date('target_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'description'),
  },
  (t) => [
    unique('projects_org_slug_unique').on(t.organizationId, t.slug),
    index('projects_org_status_idx').on(t.organizationId, t.status),
    index('projects_client_id').on(t.clientId),
    index('projects_contact_id').on(t.contactId),
    index('projects_service_id').on(t.serviceId),
    index('projects_search_idx').using('gin', t.searchVector),
    inValues('projects_status_check', t.status, PROJECT_STATUS),
    inValues('projects_type_check', t.type, PROJECT_TYPE),
  ],
);

// doc 5 §17 — project_phases (sin organization_id; scoped vía project_id)
export const projectPhases = pgTable(
  'project_phases',
  {
    id: pk(),
    projectId: uuid('project_id')
      .notNull()
      .references((): AnyPgColumn => projects.id),
    name: varchar('name').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    sortOrder: integer('sort_order').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('project_phases_project_id').on(t.projectId)],
);

// doc 5 §18 — tasks (self-ref subtasks)
export const tasks = pgTable(
  'tasks',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    projectId: uuid('project_id').references(() => projects.id),
    // Oportunidad a la que pertenece la tarea (trabajo de preventa, antes de ganar). Excluyente con projectId/personal
    // (lo garantiza el comando). Una oportunidad archivada congela sus tareas.
    opportunityId: uuid('opportunity_id').references(() => opportunities.id),
    parentTaskId: uuid('parent_task_id').references((): AnyPgColumn => tasks.id),
    title: varchar('title').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    priority: varchar('priority').notNull(),
    assigneeUserId: uuid('assignee_user_id').references(() => users.id),
    // Marca "Personal": tarea propia (no de un proyecto). Mutuamente excluyente con projectId (lo garantiza el comando).
    personal: boolean('personal').notNull().default(false),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('title', 'description'),
  },
  (t) => [
    index('tasks_org_status_due_idx').on(t.organizationId, t.status, t.dueDate),
    index('tasks_project_status_idx').on(t.projectId, t.status),
    index('tasks_opportunity_idx').on(t.opportunityId),
    index('tasks_search_idx').using('gin', t.searchVector),
    inValues('tasks_status_check', t.status, TASK_STATUS),
  ],
);

// doc 5 §19 — deliverables (project_id NOT NULL)
export const deliverables = pgTable(
  'deliverables',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    name: varchar('name').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    dueDate: date('due_date'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    externalUrl: text('external_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [
    index('deliverables_project_id').on(t.projectId),
    inValues('deliverables_status_check', t.status, DELIVERABLE_STATUS),
  ],
);

// Fase 8 (E-5) — resources: activos por cliente/proyecto (accesos, apps hosteadas, infra…). SÓLO referencias,
// NUNCA secretos: `credential_location` es un puntero al gestor de secretos. `type` es etiqueta LIBRE (sin CHECK).
export const resources = pgTable(
  'resources',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id').references(() => clients.id),
    projectId: uuid('project_id').references(() => projects.id),
    name: varchar('name').notNull(),
    type: varchar('type').notNull(), // etiqueta libre (extensible)
    status: varchar('status').notNull(),
    hosting: varchar('hosting'), // OWN / CLIENT / THIRD_PARTY (nullable)
    url: text('url'),
    provider: varchar('provider'),
    environment: varchar('environment'),
    credentialLocation: text('credential_location'), // puntero, NUNCA el secreto
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'provider', 'notes'),
  },
  (t) => [
    index('resources_org_idx').on(t.organizationId),
    index('resources_client_idx').on(t.clientId),
    index('resources_project_idx').on(t.projectId),
    index('resources_search_idx').using('gin', t.searchVector),
    inValues('resources_status_check', t.status, RESOURCE_STATUS),
    inValues('resources_hosting_check', t.hosting, RESOURCE_HOSTING),
  ],
);
