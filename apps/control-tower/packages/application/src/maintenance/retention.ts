import type { Database } from '@ct/db';
import { organizations } from '@ct/db/schema';
import type { OrganizationSettings } from '@ct/validation';
import { purgeCompletedTasks } from '../projects/index';
import { archiveClosedOpportunities } from '../crm/index';
import { purgeProcessedInbox } from '../knowledge/index';
import { purgeArchivedRecords } from './archive';
import { purgeOldSyncRuns } from '../integrations/sync-runs';
import { rotateJobLog, rotateOutboxLog } from '../jobs/log-rotation';
import { purgeReviewedItems } from '../review/index';
import { isAutomationEnabled } from '../automations/state';
import type { OrgContext } from '../auth/index';

/** Ventana (días) tras la cual una oportunidad cerrada se archiva sola. "Una semana" (owner 2026-08-16). */
export const OPPORTUNITY_ARCHIVE_AFTER_DAYS = 7;

/**
 * Barrido de retención (Fase 4): recorre las organizaciones y, para las que tengan configurada una
 * política `completedTaskRetentionDays`, purga sus tareas completadas antiguas. Pensado para el worker
 * (periódico). Usa un contexto SYSTEM con rol OWNER por organización.
 */
export async function runRetentionSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number }> {
  const orgs = await db
    .select({ id: organizations.id, settings: organizations.settings })
    .from(organizations);

  let sweptOrgs = 0;
  let deleted = 0;
  for (const o of orgs) {
    const days = (o.settings as OrganizationSettings | null)?.completedTaskRetentionDays;
    if (typeof days !== 'number' || days <= 0) continue;
    if (!(await isAutomationEnabled(db, o.id, 'sweep.retention'))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await purgeCompletedTasks(db, ctx, { retentionDays: days, now });
    sweptOrgs++;
    deleted += res.deleted;
  }
  return { organizations: sweptOrgs, deleted };
}

/**
 * Barrido de purga de ARCHIVADOS (owner 2026-08-31): recorre las organizaciones y, para las que tengan
 * configurada una política `archivedRetentionDays`, borra definitivamente lo que lleve archivado más de N días
 * (todas las entidades archivables). Deja rastro en `audit_logs`. Igual patrón que `runRetentionSweep`: contexto
 * SYSTEM con rol OWNER por organización; idempotente y restart-safe (borra por antigüedad del `archivedAt`).
 */
export async function runArchivedPurgeSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number; skipped: number }> {
  const orgs = await db
    .select({ id: organizations.id, settings: organizations.settings })
    .from(organizations);

  let sweptOrgs = 0;
  let deleted = 0;
  let skipped = 0;
  for (const o of orgs) {
    const days = (o.settings as OrganizationSettings | null)?.archivedRetentionDays;
    if (typeof days !== 'number' || days <= 0) continue;
    if (!(await isAutomationEnabled(db, o.id, 'sweep.archived_purge'))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await purgeArchivedRecords(db, ctx, { retentionDays: days, now });
    sweptOrgs++;
    deleted += res.deleted;
    skipped += res.skipped;
  }
  return { organizations: sweptOrgs, deleted, skipped };
}

/**
 * Barrido de archivado de oportunidades cerradas (owner 2026-08-16): recorre TODAS las organizaciones y archiva
 * las oportunidades de la columna «Cerradas» (LOST/ONBOARDED) cerradas hace ≥ una semana, retirándolas del Kanban.
 * Las GANADAS (WON) NO se archivan solas ("Ganada no es un estado final") — se archivan a mano si se quiere.
 * No configurable por org (ventana fija de {@link OPPORTUNITY_ARCHIVE_AFTER_DAYS} días). Idempotente y restart-safe:
 * se apoya en `closedAt` (edad), no en un temporizador, así que ejecutarlo cada hora archiva cada oportunidad ~1
 * semana tras cerrarse, sin depender de cuándo arrancó el worker. Contexto SYSTEM → sin push a Notion/Twenty.
 */
export async function runOpportunityArchiveSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; archived: number }> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let archived = 0;
  let sweptOrgs = 0;
  for (const o of orgs) {
    if (!(await isAutomationEnabled(db, o.id, 'sweep.opportunity_archive'))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await archiveClosedOpportunities(db, ctx, {
      olderThanDays: OPPORTUNITY_ARCHIVE_AFTER_DAYS,
      now,
    });
    sweptOrgs++;
    archived += res.archived;
  }
  return { organizations: sweptOrgs, archived };
}

/**
 * Barrido de la bandeja de conocimiento (owner 2026-08-17): recorre TODAS las organizaciones y BORRA las
 * capturas ya resueltas — PROCESADAS (su conocimiento vive completo en la biblioteca, la copia sobra) y
 * DESCARTADAS (ya no interesan) — para que ambas desaparezcan de la bandeja con la misma frecuencia. Pensado
 * para correr 1×/día en el worker. Idempotente y restart-safe (borra por estado, sin temporizador). Contexto
 * SYSTEM por organización.
 */
export async function runInboxPurgeSweep(
  db: Database,
): Promise<{ organizations: number; deleted: number }> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let deleted = 0;
  let sweptOrgs = 0;
  for (const o of orgs) {
    if (!(await isAutomationEnabled(db, o.id, 'sweep.inbox_purge'))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await purgeProcessedInbox(db, ctx);
    sweptOrgs++;
    deleted += res.deleted;
  }
  return { organizations: sweptOrgs, deleted };
}


/**
 * F-16 — retención del historial de syncs: conserva los N runs más recientes por proveedor y organización.
 * `sync_runs` es un historial operativo (para ver "qué pasó en la última sync"), no un registro legal: sin
 * este barrido crecería sin límite con un sync diario por integración.
 */
export async function runSyncRunsPurgeSweep(
  db: Database,
  opts: { keepPerProvider?: number } = {},
): Promise<{ organizations: number; deleted: number }> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let sweptOrgs = 0;
  let deleted = 0;
  for (const o of orgs) {
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await purgeOldSyncRuns(db, ctx, { keepPerProvider: opts.keepPerProvider });
    sweptOrgs++;
    deleted += res.deleted;
  }
  return { organizations: sweptOrgs, deleted };
}


/**
 * F-24 — rotación de los logs internos (procesos y bandeja de salida) por organización: cierra un lote cuando lo ya
 * terminado supera el umbral. Va con los barridos diarios: el volumen normal es de unas pocas filas al día.
 */
export async function runLogRotationSweep(
  db: Database,
  opts: { maxRows?: number } = {},
): Promise<{ rotated: number; archivedRows: number }> {
  const orgs = await db.select({ id: organizations.id }).from(organizations);
  let rotated = 0;
  let archivedRows = 0;
  for (const o of orgs) {
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    for (const res of [await rotateJobLog(db, ctx, opts), await rotateOutboxLog(db, ctx, opts)]) {
      if (res) {
        rotated++;
        archivedRows += res.rowCount;
      }
    }
  }
  return { rotated, archivedRows };
}


/**
 * Barrido de la cola «Por revisar»: borra lo ya resuelto que supere `settings.reviewRetentionDays`. Sin política
 * configurada no borra nada (conservar es el comportamiento por defecto).
 */
export async function runReviewPurgeSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number }> {
  const orgs = await db.select({ id: organizations.id, settings: organizations.settings }).from(organizations);
  let sweptOrgs = 0;
  let deleted = 0;
  for (const o of orgs) {
    const days = (o.settings as OrganizationSettings | null)?.reviewRetentionDays;
    if (typeof days !== 'number' || days <= 0) continue;
    if (!(await isAutomationEnabled(db, o.id, 'sweep.review_purge'))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const res = await purgeReviewedItems(db, ctx, { retentionDays: days, now });
    sweptOrgs++;
    deleted += res.deleted;
  }
  return { organizations: sweptOrgs, deleted };
}
