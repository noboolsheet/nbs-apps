import { pgTable, uuid, varchar, text, timestamp, integer, index, unique, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inValues, searchVector } from './_shared';
import { organizations, users } from './organizations';
import { projects } from './operations';
import { services } from './governance';
import { clients } from './crm';
import {
  DECISION_STATUS,
  KNOWLEDGE_TYPE,
  KNOWLEDGE_ITEM_STATUS,
  KNOWLEDGE_INBOX_STATUS,
  ASSET_STATUS,
  PORTFOLIO_ITEM_STATUS,
  PORTFOLIO_ITEM_VISIBILITY,
  LEARNING_STATUS,
  REVIEW_ITEM_STATUS,
} from './enums';

// doc 5 §20 — decisions (ERRATA-002 lifecycle; global o project/service-scoped)
export const decisions = pgTable(
  'decisions',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    projectId: uuid('project_id').references(() => projects.id),
    serviceId: uuid('service_id').references(() => services.id),
    title: varchar('title').notNull(),
    context: text('context'),
    decision: text('decision').notNull(),
    rationale: text('rationale'),
    status: varchar('status').notNull(),
    // A-2 (ADR-006): qué decisión reemplaza a cuál. La NUEVA apunta a la ANTIGUA (self-FK, misma dirección
    // que "supersedes" del wireframe); el inverso "superseded by" se resuelve por query.
    supersedesDecisionId: uuid('supersedes_decision_id').references((): AnyPgColumn => decisions.id),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('title', 'context', 'decision', 'rationale'),
  },
  (t) => [
    index('decisions_org_status_idx').on(t.organizationId, t.status),
    index('decisions_project_id').on(t.projectId),
    index('decisions_supersedes_idx').on(t.supersedesDecisionId),
    index('decisions_search_idx').using('gin', t.searchVector),
    inValues('decisions_status_check', t.status, DECISION_STATUS),
  ],
);

// doc 5 §22 — knowledge_inbox (capturas pendientes de clasificación)
export const knowledgeInbox = pgTable(
  'knowledge_inbox',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: varchar('title'),
    rawContent: text('raw_content').notNull(),
    sourceType: varchar('source_type').notNull(),
    sourceUrl: text('source_url'),
    sourceExternalId: varchar('source_external_id'),
    status: varchar('status').notNull(),
    // Pre-clasificación editable desde el panel antes de procesar (se lleva al knowledge_item al promover).
    knowledgeType: varchar('knowledge_type'), // enum KNOWLEDGE_TYPE (nullable: capturas previas sin tipo)
    sector: varchar('sector'), // sector/dominio (etiqueta libre, extensible)
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('knowledge_inbox_org_status_idx').on(t.organizationId, t.status),
    inValues('knowledge_inbox_status_check', t.status, KNOWLEDGE_INBOX_STATUS),
    inValues('knowledge_inbox_type_check', t.knowledgeType, KNOWLEDGE_TYPE),
  ],
);

// doc 5 §21 — knowledge_items
export const knowledgeItems = pgTable(
  'knowledge_items',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: varchar('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    knowledgeType: varchar('knowledge_type').notNull(),
    sector: varchar('sector'), // sector/dominio del conocimiento (etiqueta libre, extensible) para filtrar la Library
    status: varchar('status').notNull(),
    sourceType: varchar('source_type').notNull(),
    sourceUrl: text('source_url'),
    sourceExternalId: varchar('source_external_id'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('title', 'summary', 'content'),
  },
  (t) => [
    index('knowledge_items_org_status_idx').on(t.organizationId, t.status),
    index('knowledge_items_search_idx').using('gin', t.searchVector),
    inValues('knowledge_items_status_check', t.status, KNOWLEDGE_ITEM_STATUS),
    inValues('knowledge_items_type_check', t.knowledgeType, KNOWLEDGE_TYPE),
  ],
);

// doc 5 §23 — documents (metadata + referencia externa; no editor documental)
export const documents = pgTable(
  'documents',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    projectId: uuid('project_id').references(() => projects.id),
    clientId: uuid('client_id').references(() => clients.id),
    name: varchar('name').notNull(),
    documentType: varchar('document_type'),
    mimeType: varchar('mime_type'),
    externalUrl: text('external_url'),
    externalProvider: varchar('external_provider'),
    externalId: varchar('external_id'),
    status: varchar('status').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [
    index('documents_org_idx').on(t.organizationId),
    index('documents_project_id').on(t.projectId),
    index('documents_client_id').on(t.clientId),
  ],
);

// doc 5 §24 — assets (activos reutilizables)
export const assets = pgTable(
  'assets',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    assetType: varchar('asset_type').notNull(),
    description: text('description'),
    status: varchar('status').notNull(),
    version: varchar('version'),
    externalUrl: text('external_url'),
    repositoryUrl: text('repository_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'description'),
  },
  (t) => [
    index('assets_org_idx').on(t.organizationId),
    index('assets_search_idx').using('gin', t.searchVector),
    inValues('assets_status_check', t.status, ASSET_STATUS),
  ],
);

// A-3 (ADR-007) — project_assets: enlace N:M proyecto↔activo. El dominio pide REUTILIZACIÓN (un asset se usa en
// varios proyectos), así que es tabla puente y no `assets.project_id`. Sin organization_id: scoped vía ambos lados
// (los comandos verifican que proyecto y asset son de la org del contexto).
export const projectAssets = pgTable(
  'project_assets',
  {
    id: pk(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique('project_assets_unique').on(t.projectId, t.assetId),
    index('project_assets_project_id').on(t.projectId),
    index('project_assets_asset_id').on(t.assetId),
  ],
);

/**
 * «Por revisar»: cola de cosas que quieres leer o ver (artículos, vídeos, libros, hilos…). Es una **bandeja de
 * entrada de consumo**, distinta de sus vecinas: `learning_items` es formación estructurada con progreso,
 * `knowledge_items` es lo que YA has destilado y `documents` son ficheros de Drive. Aquí sólo hay un enlace, de qué
 * tipo es y si ya lo has revisado.
 *
 * Espejo BIDIRECCIONAL con Notion (propiedad por campo): sirve para guardar enlaces desde el móvil en Notion y
 * verlos aquí, o al revés.
 */
export const reviewItems = pgTable(
  'review_items',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: varchar('title').notNull(),
    /** ARTICLE / VIDEO / BOOK / PODCAST… etiqueta libre curada en la UI. */
    kind: varchar('kind'),
    url: text('url'),
    status: varchar('status').notNull(),
    /** Mismo vocabulario de sectores que la biblioteca, para poder filtrar igual. */
    sector: varchar('sector'),
    notes: text('notes'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    /**
     * Elemento de la biblioteca creado al procesarlo. Sirve para dos cosas: enlazar desde la cola a lo que se
     * guardó, y evitar promover dos veces el mismo recurso (crearía duplicados en la biblioteca).
     */
    knowledgeItemId: uuid('knowledge_item_id').references((): AnyPgColumn => knowledgeItems.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('title', 'notes'),
  },
  (t) => [
    index('review_items_org_status_idx').on(t.organizationId, t.status),
    index('review_items_search_idx').using('gin', t.searchVector),
    inValues('review_items_status_check', t.status, REVIEW_ITEM_STATUS),
  ],
);

// ADR-001 — portfolio_items (no está en el modelo físico congelado; ver docs/adr/ADR-001)
export const portfolioItems = pgTable(
  'portfolio_items',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    description: text('description'),
    type: varchar('type').notNull(),
    status: varchar('status').notNull(),
    projectId: uuid('project_id').references(() => projects.id),
    assetId: uuid('asset_id').references(() => assets.id),
    visibility: varchar('visibility').notNull(),
    externalUrl: text('external_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('name', 'description'),
  },
  (t) => [
    index('portfolio_items_org_idx').on(t.organizationId),
    index('portfolio_items_project_id').on(t.projectId),
    index('portfolio_items_status_idx').on(t.status),
    index('portfolio_items_search_idx').using('gin', t.searchVector),
    inValues('portfolio_items_status_check', t.status, PORTFOLIO_ITEM_STATUS),
    inValues('portfolio_items_visibility_check', t.visibility, PORTFOLIO_ITEM_VISIBILITY),
  ],
);

// Learning Path — tracking de aprendizaje (cursos, habilidades, temas, roadmaps). CT-nativo, distinto de capabilities.
// `kind` y `sector` son etiquetas libres (extensibles); `status` cerrado. Solo referencias (link al recurso online).
export const learningItems = pgTable(
  'learning_items',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    title: varchar('title').notNull(),
    kind: varchar('kind').notNull(), // Curso / Habilidad / Tema / Roadmap… (etiqueta libre)
    status: varchar('status').notNull(),
    sector: varchar('sector'), // misma taxonomía que knowledge_items.sector
    url: text('url'), // link directo al recurso online que estoy estudiando
    progress: integer('progress'), // 0–100 (opcional)
    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
    searchVector: searchVector('title', 'notes'),
  },
  (t) => [
    index('learning_items_org_idx').on(t.organizationId),
    index('learning_items_org_status_idx').on(t.organizationId, t.status),
    index('learning_items_search_idx').using('gin', t.searchVector),
    inValues('learning_items_status_check', t.status, LEARNING_STATUS),
  ],
);
