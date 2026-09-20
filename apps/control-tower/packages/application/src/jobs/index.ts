import { and, eq, lt, lte, gte, asc, desc, or, isNull, isNotNull, count } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { jobs } from '@ct/db/schema';
import { logger } from '@ct/shared';
import type { OrgContext } from '../auth/index';

/**
 * Antigüedad tras la cual una fila en PROCESSING se considera "colgada" (el worker que la reclamó murió sin
 * completarla ni marcarla fallida). Generosa: con el timeout de HTTP (30 s) ningún handler legítimo tarda tanto,
 * así que 10 min sin heartbeat = worker caído. La usa el reaper de jobs y el de outbox.
 */
export const STUCK_STALE_MS = 10 * 60_000;

/**
 * Cola de jobs persistida en PostgreSQL (doc 4 §13-14, doc old_9 §18). Contrato IMP-007:
 * queued(PENDING) → running(PROCESSING) → succeeded(COMPLETED) / failed(FAILED) / retryable
 * (vuelve a PENDING con backoff mientras attempts < max_attempts). El claim usa
 * `FOR UPDATE SKIP LOCKED` para permitir varios workers sin doble-procesamiento.
 */

export type Job = typeof jobs.$inferSelect;
export type JobHandler = (job: Job, db: Database) => Promise<void>;
export type JobRegistry = Record<string, JobHandler>;

export interface EnqueueJobInput {
  jobType: string;
  payload?: unknown;
  organizationId?: string | null;
  priority?: number;
  maxAttempts?: number;
  availableAt?: Date;
}

export async function enqueueJob(db: Database, input: EnqueueJobInput): Promise<Job> {
  const [row] = await db
    .insert(jobs)
    .values({
      jobType: input.jobType,
      payload: input.payload ?? {},
      status: 'PENDING',
      organizationId: input.organizationId ?? null,
      priority: input.priority ?? 0,
      maxAttempts: input.maxAttempts ?? 5,
      availableAt: input.availableAt ?? new Date(),
    })
    .returning();
  return row!;
}

/** Reclama el siguiente job disponible (transaccional, SKIP LOCKED) y lo marca PROCESSING. */
export async function claimNextJob(db: Database, workerId: string): Promise<Job | null> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.status, 'PENDING'), lte(jobs.availableAt, new Date())))
      .orderBy(desc(jobs.priority), asc(jobs.availableAt))
      .limit(1)
      .for('update', { skipLocked: true });
    const job = rows[0];
    if (!job) return null;
    const [claimed] = await tx
      .update(jobs)
      .set({ status: 'PROCESSING', lockedAt: new Date(), lockedBy: workerId, attempts: job.attempts + 1, updatedAt: new Date() })
      .where(eq(jobs.id, job.id))
      .returning();
    return claimed!;
  });
}

export async function completeJob(db: Database, id: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: 'COMPLETED', completedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(jobs.id, id));
}

/** Marca fallo: retryable (PENDING + backoff exponencial) si attempts < max, si no FAILED. */
export async function failJob(db: Database, job: Job, error: unknown): Promise<'retry' | 'failed'> {
  const msg = error instanceof Error ? error.message : String(error);
  if (job.attempts >= job.maxAttempts) {
    await db
      .update(jobs)
      .set({ status: 'FAILED', failedAt: new Date(), lastError: msg, updatedAt: new Date() })
      .where(eq(jobs.id, job.id));
    return 'failed';
  }
  const backoffSec = Math.min(300, 2 ** job.attempts); // 2,4,8,… tope 5 min
  await db
    .update(jobs)
    .set({ status: 'PENDING', availableAt: new Date(Date.now() + backoffSec * 1000), lockedAt: null, lockedBy: null, lastError: msg, updatedAt: new Date() })
    .where(eq(jobs.id, job.id));
  return 'retry';
}

/** Reclama y procesa un job con el registry. Devuelve el resultado para el loop del worker. */
export async function processNextJob(
  db: Database,
  registry: JobRegistry,
  workerId: string,
): Promise<'idle' | 'completed' | 'retry' | 'failed'> {
  const job = await claimNextJob(db, workerId);
  if (!job) return 'idle';
  const log = logger.child({ task: 'job', jobId: job.id, jobType: job.jobType });
  try {
    const handler = registry[job.jobType];
    if (!handler) throw new Error(`No hay handler para el job type "${job.jobType}"`);
    await handler(job, db);
    await completeJob(db, job.id);
    log.info('job completed');
    return 'completed';
  } catch (error) {
    const outcome = await failJob(db, job, error);
    log.warn('job failed', { outcome, error: error instanceof Error ? error.message : String(error) });
    return outcome;
  }
}

/**
 * Reaper de jobs COLGADOS: filas en PROCESSING cuyo `lockedAt` es más viejo que `staleMs` (el worker que las
 * reclamó murió entre el claim y `completeJob`/`failJob`). Sin esto quedarían atascadas para siempre. Como el
 * claim ya incrementó `attempts`, el reaper NO lo vuelve a incrementar: solo decide reintentar (→ PENDING,
 * disponible ya) o rendirse (→ FAILED) según `attempts` vs `maxAttempts`. Idempotente y seguro de correr a menudo.
 */
export async function reapStuckJobs(
  db: Database,
  opts?: { staleMs?: number; now?: Date },
): Promise<{ requeued: number; failed: number }> {
  const now = opts?.now ?? new Date();
  const cutoff = new Date(now.getTime() - (opts?.staleMs ?? STUCK_STALE_MS));
  const failed = await db
    .update(jobs)
    .set({ status: 'FAILED', failedAt: now, lockedAt: null, lockedBy: null, lastError: 'Reaped: PROCESSING colgado (worker sin heartbeat); intentos agotados', updatedAt: now })
    .where(and(eq(jobs.status, 'PROCESSING'), lt(jobs.lockedAt, cutoff), gte(jobs.attempts, jobs.maxAttempts)))
    .returning({ id: jobs.id });
  const requeued = await db
    .update(jobs)
    .set({ status: 'PENDING', availableAt: now, lockedAt: null, lockedBy: null, lastError: 'Reaped: PROCESSING colgado (worker sin heartbeat); reencolado', updatedAt: now })
    .where(and(eq(jobs.status, 'PROCESSING'), lt(jobs.lockedAt, cutoff), lt(jobs.attempts, jobs.maxAttempts)))
    .returning({ id: jobs.id });
  return { requeued: requeued.length, failed: failed.length };
}

// --- Consultas para la pantalla de Automation / System Health ---
export async function jobStatusCounts(db: Database) {
  const rows = await db.select({ status: jobs.status, n: count() }).from(jobs).groupBy(jobs.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

/**
 * Errores recientes de los procesos en segundo plano: los jobs FAILED/PENDING que traen `last_error`. Es lo primero
 * que se enseña al entrar en Automatización — "¿algo se ha roto?" antes que ningún contador.
 */
export async function listRecentJobErrors(db: Database, limit = 10) {
  const rows = await db
    .select({ id: jobs.id, jobType: jobs.jobType, lastError: jobs.lastError, updatedAt: jobs.updatedAt })
    .from(jobs)
    .where(and(or(eq(jobs.status, 'FAILED'), eq(jobs.status, 'PENDING')), isNotNull(jobs.lastError)))
    .orderBy(desc(jobs.updatedAt))
    .limit(limit);
  return rows.map((j) => ({ id: j.id, jobType: j.jobType, error: j.lastError!, at: j.updatedAt }));
}

/**
 * Histórico COMPLETO de procesos para exportar. La tabla `jobs` no se purga nunca, así que aquí está todo lo que ha
 * ejecutado el worker desde el primer día; la pantalla sólo enseña los últimos, esto es para descargarlo entero.
 * Incluye los jobs de la organización y los **globales** (`organization_id` nulo: barridos y tareas de sistema), que
 * son los mismos que muestra la lista. `limit` es un tope de seguridad para no cargar en memoria una tabla enorme.
 */
export function listJobsForExport(db: Database, ctx: OrgContext, limit = 5000) {
  return db
    .select()
    .from(jobs)
    .where(or(eq(jobs.organizationId, ctx.organizationId), isNull(jobs.organizationId)))
    .orderBy(desc(jobs.createdAt))
    .limit(limit);
}

export function listRecentJobs(db: Database, limit = 20) {
  return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
}

export * from './log-rotation';
