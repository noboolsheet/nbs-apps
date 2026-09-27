import type { Database } from '@ct/db';
import { organizations } from '@ct/db/schema';
import type { OrganizationSettings } from '@ct/validation';
import { purgeCompletedTasks } from '../projects/index';
import { archiveClosedOpportunities } from '../crm/index';
import { purgeProcessedInbox } from '../knowledge/index';
import { archiveTerminalRecords, purgeArchivedRecords } from './archive';
import { purgeOldSyncRuns } from '../integrations/sync-runs';
import { rotateJobLog, rotateOutboxLog } from '../jobs/log-rotation';
import { purgeReviewedItems } from '../review/index';
import { isAutomationEnabled } from '../automations/state';
import { recordAutomationRun, purgeOldAutomationRuns } from '../automations/runs';
import { logger } from '@ct/shared';
import type { OrgContext } from '../auth/index';

/** Ventana (días) tras la cual una oportunidad cerrada se archiva sola. "Una semana" (owner 2026-08-16). */
export const OPPORTUNITY_ARCHIVE_AFTER_DAYS = 7;

type SweepResult = Record<string, number>;

/**
 * **El bucle de todos los barridos, una sola vez** — y con huella (E-8, owner 2026-09-27).
 *
 * Los seis barridos tenían copiado el mismo bucle: leer las organizaciones, saltar las que lo tengan pausado, montar
 * un contexto SYSTEM y acumular contadores. Y **ninguno dejaba rastro**: si un barrido archivaba o borraba algo, lo
 * único que quedaba era una línea en el log del contenedor. Aquí se hace una vez y se anota cada ejecución en
 * `automation_runs`, que es lo que el panel de Automatización muestra como «última ejecución».
 *
 * Dos matices que no son detalles:
 *  · `fn` devuelve `null` cuando **no hay política configurada** («conservar siempre»): eso NO se anota, porque no ha
 *    pasado nada — anotarlo llenaría el historial de ejecuciones vacías y escondería las de verdad.
 *  · Un fallo en una organización se anota como FAILED y **no para las demás** (mismo criterio que los syncs).
 */
async function sweepEachOrg(
  db: Database,
  key: string,
  fn: (ctx: OrgContext, settings: OrganizationSettings | null) => Promise<SweepResult | null>,
): Promise<{ organizations: number; totals: SweepResult }> {
  const orgs = await db.select({ id: organizations.id, settings: organizations.settings }).from(organizations);
  const totals: SweepResult = {};
  let sweptOrgs = 0;
  for (const o of orgs) {
    if (!(await isAutomationEnabled(db, o.id, key))) continue;
    const ctx: OrgContext = { userId: 'system', organizationId: o.id, role: 'OWNER' };
    const startedAt = new Date();
    try {
      const res = await fn(ctx, (o.settings as OrganizationSettings | null) ?? null);
      if (res === null) continue;
      await recordAutomationRun(db, ctx, { automationKey: key, startedAt, result: res });
      sweptOrgs++;
      for (const [k, v] of Object.entries(res)) totals[k] = (totals[k] ?? 0) + v;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await recordAutomationRun(db, ctx, { automationKey: key, startedAt, error });
      logger.warn('barrido fallido en una organización', { automationKey: key, organizationId: o.id, error });
    }
  }
  return { organizations: sweptOrgs, totals };
}

/**
 * Barrido de retención (Fase 4): purga las tareas completadas más antiguas que `completedTaskRetentionDays`. Sin
 * política configurada no hace nada (y no cuenta como ejecución).
 */
export async function runRetentionSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.retention', async (ctx, settings) => {
    const days = settings?.completedTaskRetentionDays;
    if (typeof days !== 'number' || days <= 0) return null;
    const res = await purgeCompletedTasks(db, ctx, { retentionDays: days, now });
    return { deleted: res.deleted, blocked: res.blocked, skippedParents: res.skippedParents };
  });
  return { organizations, deleted: totals.deleted ?? 0 };
}

/**
 * Barrido de purga de ARCHIVADOS (owner 2026-08-31): borra definitivamente lo que lleve archivado más de
 * `archivedRetentionDays` días. `skipped` (lo que una fila viva aún referencia) deja el run «con advertencias».
 */
export async function runArchivedPurgeSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number; skipped: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.archived_purge', async (ctx, settings) => {
    const days = settings?.archivedRetentionDays;
    if (typeof days !== 'number' || days <= 0) return null;
    const res = await purgeArchivedRecords(db, ctx, { retentionDays: days, now });
    return { deleted: res.deleted, skipped: res.skipped };
  });
  return { organizations, deleted: totals.deleted ?? 0, skipped: totals.skipped ?? 0 };
}

/**
 * Autoarchivado por ESTADO TERMINAL (owner 2026-09-27): archiva lo que lleve una semana cerrado (ver
 * `TERMINAL_STATUS`). Ventana fija, no configurable: quien no la quiera pausa la automatización.
 */
export async function runTerminalArchiveSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; archived: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.terminal_archive', async (ctx) => {
    const res = await archiveTerminalRecords(db, ctx, { now });
    return { archived: res.archived };
  });
  return { organizations, archived: totals.archived ?? 0 };
}

/**
 * Autoarchivado de oportunidades cerradas (owner 2026-08-16): retira del Kanban las de la columna «Cerradas»
 * (LOST/ONBOARDED) cerradas hace ≥ {@link OPPORTUNITY_ARCHIVE_AFTER_DAYS} días, con sus tareas de preventa. Las
 * GANADAS no se archivan solas. Idempotente y restart-safe: se apoya en `closedAt`, no en un temporizador, así que
 * ejecutarlo cada día archiva cada oportunidad ~1 semana tras cerrarse. Contexto SYSTEM → sin push a Notion/Twenty.
 */
export async function runOpportunityArchiveSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; archived: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.opportunity_archive', async (ctx) => {
    const res = await archiveClosedOpportunities(db, ctx, { olderThanDays: OPPORTUNITY_ARCHIVE_AFTER_DAYS, now });
    return { archived: res.archived };
  });
  return { organizations, archived: totals.archived ?? 0 };
}

/**
 * Barrido de la bandeja de conocimiento (owner 2026-08-17): BORRA las capturas ya resueltas —PROCESADAS (su texto
 * vive completo en la biblioteca) y DESCARTADAS—, sin retención a propósito: no se guardan dos copias de lo mismo.
 */
export async function runInboxPurgeSweep(db: Database): Promise<{ organizations: number; deleted: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.inbox_purge', async (ctx) => {
    const res = await purgeProcessedInbox(db, ctx);
    return { deleted: res.deleted };
  });
  return { organizations, deleted: totals.deleted ?? 0 };
}

/**
 * Barrido de la cola «Por revisar»: borra lo ya resuelto que supere `reviewRetentionDays`. Sin política no borra nada.
 */
export async function runReviewPurgeSweep(
  db: Database,
  now?: Date,
): Promise<{ organizations: number; deleted: number }> {
  const { organizations, totals } = await sweepEachOrg(db, 'sweep.review_purge', async (ctx, settings) => {
    const days = settings?.reviewRetentionDays;
    if (typeof days !== 'number' || days <= 0) return null;
    const res = await purgeReviewedItems(db, ctx, { retentionDays: days, now });
    return { deleted: res.deleted };
  });
  return { organizations, deleted: totals.deleted ?? 0 };
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
    // Y el historial de ejecuciones de los BARRIDOS (E-8), que es la misma familia de dato —«qué pasó
    // últimamente»— y crecería igual: seis barridos diarios son ~2.200 filas al año por organización.
    const runs = await purgeOldAutomationRuns(db, ctx, {});
    sweptOrgs++;
    deleted += res.deleted + runs.deleted;
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
