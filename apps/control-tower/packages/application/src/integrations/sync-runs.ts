import { and, desc, inArray } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { syncRuns } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';
import type { SyncSkip } from './sync-common';

/**
 * F-16 — historial de ejecuciones de sync. La resiliencia por-registro (F-13) ya generaba el detalle de lo
 * saltado, pero sólo quedaba en los logs del worker: aquí se PERSISTE por run para poder verlo en la app.
 */

/** Máximo de skips que se guardan por run (el resto se cuenta pero no se detalla: la fila no debe crecer sin fin). */
const MAX_SKIPS_STORED = 50;

export interface SyncOutcome {
  created?: number;
  updated?: number;
  /** Borrado definitivo (hoy sólo la caché de Calendar). */
  deleted?: number;
  /** Archivados por la reconciliación: ya no existen en el origen (M40). Reversible. */
  archived?: number;
  skipped?: SyncSkip[];
}

/**
 * Normaliza el summary de CUALQUIER sync (cada uno tiene su forma: `{companies: {created, updated}, …}`,
 * `{files: {…}}`, `{results: […]}`) a los contadores agregados + la lista de skips. Suma recursivamente las
 * claves `created`/`updated`/`deleted` que encuentre y concatena todos los `skipped`.
 */
export function toSyncOutcome(summary: unknown): SyncOutcome {
  const out: SyncOutcome = { created: 0, updated: 0, deleted: 0, archived: 0, skipped: [] };
  walk(summary, out);
  return out;
}

function walk(node: unknown, out: SyncOutcome): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'skipped' && Array.isArray(value)) {
      out.skipped!.push(...(value as SyncSkip[]));
    } else if (typeof value === 'number') {
      if (key === 'created' || key === 'pushedCreated') out.created! += value;
      // `restored` (desarchivado por haber vuelto al origen) cuenta como actualización: la fila cambió.
      // `adopted` NO se suma: esas filas ya vienen contadas en `updated` por el propio bucle del sync.
      else if (key === 'updated' || key === 'pushedUpdated' || key === 'upserted' || key === 'imported' || key === 'restored')
        out.updated! += value;
      else if (key === 'deleted') out.deleted! += value;
      else if (key === 'archived') out.archived! += value;
    } else {
      walk(value, out);
    }
  }
}

/** Guarda el resultado de un run. `error` presente ⇒ FAILED; con skips ⇒ COMPLETED_WITH_WARNINGS. */
export async function recordSyncRun(
  db: Database,
  ctx: OrgContext,
  run: {
    provider: string;
    jobType: string;
    integrationId?: string | null;
    startedAt: Date;
    outcome?: SyncOutcome;
    error?: string;
  },
) {
  const skipped = run.outcome?.skipped ?? [];
  const status = run.error ? 'FAILED' : skipped.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';
  const [row] = await db
    .insert(syncRuns)
    .values({
      organizationId: ctx.organizationId,
      integrationId: run.integrationId ?? null,
      provider: run.provider,
      jobType: run.jobType,
      status,
      created: run.outcome?.created ?? 0,
      updated: run.outcome?.updated ?? 0,
      deleted: run.outcome?.deleted ?? 0,
      archived: run.outcome?.archived ?? 0,
      skippedCount: skipped.length,
      skips: skipped.length > 0 ? skipped.slice(0, MAX_SKIPS_STORED) : null,
      error: run.error ?? null,
      startedAt: run.startedAt,
      finishedAt: new Date(),
    })
    .returning();
  return row!;
}

/** Últimos runs de la organización (historial general de `/automation`). */
export function listSyncRuns(db: Database, ctx: OrgContext, limit = 20) {
  return db
    .select()
    .from(syncRuns)
    .where(orgEq(syncRuns.organizationId, ctx))
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);
}

/**
 * El run MÁS RECIENTE de cada proveedor (para pintar "última sync: N creados… K saltados" junto a cada
 * integración). `DISTINCT ON` de Postgres: una fila por provider, la de `started_at` mayor.
 */
export async function latestSyncRunByProvider(db: Database, ctx: OrgContext) {
  const rows = await db
    .select()
    .from(syncRuns)
    .where(orgEq(syncRuns.organizationId, ctx))
    .orderBy(desc(syncRuns.startedAt))
    .limit(200);
  const byProvider = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!byProvider.has(r.provider)) byProvider.set(r.provider, r);
  return byProvider;
}

/**
 * Retención: conserva los `keep` runs más recientes por proveedor y borra el resto (la tabla es un historial
 * operativo, no un registro legal). Lo llama el barrido del worker.
 */
export async function purgeOldSyncRuns(
  db: Database,
  ctx: OrgContext,
  opts: { keepPerProvider?: number } = {},
): Promise<{ deleted: number }> {
  const keep = opts.keepPerProvider ?? 50;
  const rows = await db
    .select({ id: syncRuns.id, provider: syncRuns.provider })
    .from(syncRuns)
    .where(orgEq(syncRuns.organizationId, ctx))
    .orderBy(desc(syncRuns.startedAt));
  const seen = new Map<string, number>();
  const toDelete: string[] = [];
  for (const r of rows) {
    const n = (seen.get(r.provider) ?? 0) + 1;
    seen.set(r.provider, n);
    if (n > keep) toDelete.push(r.id);
  }
  if (toDelete.length === 0) return { deleted: 0 };
  await db.delete(syncRuns).where(and(orgEq(syncRuns.organizationId, ctx), inArray(syncRuns.id, toDelete)));
  return { deleted: toDelete.length };
}
