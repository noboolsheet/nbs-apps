import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inet, inValues, customBytea } from './_shared';
import { organizations, users } from './organizations';
import {
  INTEGRATION_STATUS,
  SYNC_RUN_STATUS,
  LOG_ARCHIVE_KIND,
  AUTOMATION_STATUS,
  JOB_STATUS,
  OUTBOX_STATUS,
} from './enums';

// doc 5 §25 — external_identities (idempotencia de sync; internal_id polimórfico sin FK DB)
export const externalIdentities = pgTable(
  'external_identities',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    provider: varchar('provider').notNull(),
    externalType: varchar('external_type').notNull(),
    externalId: varchar('external_id').notNull(),
    internalType: varchar('internal_type').notNull(),
    internalId: uuid('internal_id').notNull(),
    metadata: jsonb('metadata'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    /**
     * M40 — "el origen dejó de devolver este registro", puesto por la reconciliación de borrados
     * (`reconcileMissing`). Columna propia y no una clave de `metadata` porque cada sync reescribe `metadata`
     * entera con la URL de "Open external". Null = el origen lo sigue teniendo.
     */
    missingSince: timestamp('missing_since', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('external_identities_provider_type_extid_unique').on(
      t.provider,
      t.externalType,
      t.externalId,
    ),
    index('external_identities_org_idx').on(t.organizationId),
    index('external_identities_internal_idx').on(t.internalType, t.internalId),
  ],
);

// doc 5 §26 — integrations (secretos NO aquí; van a env/secret storage)
export const integrations = pgTable(
  'integrations',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    provider: varchar('provider').notNull(),
    status: varchar('status').notNull(),
    displayName: varchar('display_name').notNull(),
    configuration: jsonb('configuration'),
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('integrations_org_idx').on(t.organizationId),
    inValues('integrations_status_check', t.status, INTEGRATION_STATUS),
  ],
);

/**
 * F-24 — **rotación del histórico de procesos y de la bandeja de salida**. Las tablas `jobs` y `outbox_events` son los
 * "ficheros de log" activos; cuando sus filas ya terminadas superan el umbral, se cierra un LOTE: su CSV se guarda aquí
 * comprimido (gzip) y esas filas se borran de la tabla caliente, que vuelve a quedar pequeña. Así el histórico se sigue
 * pudiendo consultar y descargar sin que nada crezca sin límite.
 *
 * Una sola tabla para los dos tipos (`kind`), no una por cada uno: mismo formato, misma UI y un único endpoint de
 * descarga. Vive en la base de datos a propósito (decisión del owner, 2026-09-01): el `pg_dump` de `backup.sh` ya lo
 * respalda, sin ficheros ni permisos que gestionar en la Pi.
 */
export const logArchives = pgTable(
  'log_archives',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    /** Qué log es este lote: JOBS (procesos) u OUTBOX (envíos a sistemas externos). */
    kind: varchar('kind').notNull(),
    /** Nº de lote, incremental por organización y tipo: 1, 2, 3… (el "nombre del fichero"). */
    seq: integer('seq').notNull(),
    /** Rango cubierto por el lote (fecha de creación de la fila más antigua y de la más reciente). */
    rangeFrom: timestamp('range_from', { withTimezone: true }).notNull(),
    rangeTo: timestamp('range_to', { withTimezone: true }).notNull(),
    rowCount: integer('row_count').notNull(),
    /** Tamaño del CSV comprimido, para enseñarlo en la lista sin descargarlo. */
    sizeBytes: integer('size_bytes').notNull(),
    /** CSV completo del lote, comprimido con gzip. */
    content: customBytea('content').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('log_archives_org_kind_seq_unique').on(t.organizationId, t.kind, t.seq),
    index('log_archives_org_created_idx').on(t.organizationId, t.createdAt),
    inValues('log_archives_kind_check', t.kind, LOG_ARCHIVE_KIND),
  ],
);

/**
 * F-16 — historial de ejecuciones de sync (una fila por run). La resiliencia por-registro (F-13) YA generaba
 * el detalle de los registros saltados, pero sólo vivía en los logs del worker: aquí se persiste para poder
 * consultarlo desde la app ("última sync: N creados, M actualizados, K saltados" + el motivo de cada fallo).
 * Retención: el barrido del worker conserva los últimos N runs por integración (no crece sin límite).
 */
export const syncRuns = pgTable(
  'sync_runs',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    // Nullable: un sync lanzado sin `integrationId` en el payload (o de una integración ya desconectada).
    integrationId: uuid('integration_id').references(() => integrations.id),
    provider: varchar('provider').notNull(),
    jobType: varchar('job_type').notNull(),
    status: varchar('status').notNull(), // COMPLETED · COMPLETED_WITH_WARNINGS · FAILED
    created: integer('created').notNull().default(0),
    updated: integer('updated').notNull().default(0),
    deleted: integer('deleted').notNull().default(0),
    /** M40 — archivados por la reconciliación (ya no existen en el origen). Distinto de `deleted` (definitivo). */
    archived: integer('archived').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    /** Detalle de los registros saltados: [{ entity, externalId, error }], recortado a un máximo razonable. */
    skips: jsonb('skips'),
    /** Mensaje del error que abortó el sync entero (sólo en FAILED). */
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index('sync_runs_org_started_idx').on(t.organizationId, t.startedAt),
    index('sync_runs_integration_idx').on(t.integrationId),
    inValues('sync_runs_status_check', t.status, SYNC_RUN_STATUS),
  ],
);

// doc 5 §27 — automations
export const automations = pgTable(
  'automations',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    description: text('description'),
    triggerType: varchar('trigger_type').notNull(),
    status: varchar('status').notNull(),
    configuration: jsonb('configuration'),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [
    index('automations_org_idx').on(t.organizationId),
    inValues('automations_status_check', t.status, AUTOMATION_STATUS),
  ],
);

// doc 5 §28 — outbox_events (Transactional Outbox; sin updated_at)
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    eventType: varchar('event_type').notNull(),
    aggregateType: varchar('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status').notNull(),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: createdAt(),
  },
  (t) => [
    index('outbox_events_status_available_idx').on(t.status, t.availableAt),
    index('outbox_events_aggregate_idx').on(t.aggregateType, t.aggregateId),
    inValues('outbox_events_status_check', t.status, OUTBOX_STATUS),
  ],
);

// doc 5 §29 — jobs (cola persistida; claim con FOR UPDATE SKIP LOCKED en M11)
export const jobs = pgTable(
  'jobs',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    jobType: varchar('job_type').notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status').notNull(),
    priority: integer('priority').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: varchar('locked_by'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('jobs_status_available_idx').on(t.status, t.availableAt),
    inValues('jobs_status_check', t.status, JOB_STATUS),
  ],
);

// doc 5 §30 — audit_logs (inmutable; "quién hizo qué"; sin cascade delete)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorType: varchar('actor_type').notNull(),
    action: varchar('action').notNull(),
    entityType: varchar('entity_type').notNull(),
    entityId: uuid('entity_id'),
    metadata: jsonb('metadata'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_org_idx').on(t.organizationId),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  ],
);

// doc 5 §31 — change_events ("cómo cambió el estado"; distinto de audit_logs)
export const changeEvents = pgTable(
  'change_events',
  {
    id: pk(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    entityType: varchar('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    changeType: varchar('change_type').notNull(),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    actorType: varchar('actor_type').notNull(),
    actorId: uuid('actor_id'),
    createdAt: createdAt(),
  },
  (t) => [index('change_events_entity_idx').on(t.entityType, t.entityId)],
);

// Fase 7 (E-6) — canales de captura del Inbox. Cada canal es una "conexión" con nombre + token (hasheado)
// que una herramienta externa (n8n/email/extensión…) usa para POST al webhook. El secreto NO se guarda en claro.
export const inboxChannels = pgTable(
  'inbox_channels',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: varchar('name').notNull(),
    tokenHash: varchar('token_hash').notNull(),
    status: varchar('status').notNull(), // ACTIVE / DISABLED
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('inbox_channels_org_idx').on(t.organizationId)],
);
