import { gzipSync, gunzipSync } from 'node:zlib';
import { and, desc, eq, inArray, max, count } from 'drizzle-orm';
import type { Database, DbOrTx } from '@ct/db';
import { jobs, outboxEvents, logArchives } from '@ct/db/schema';
import type { LogArchiveKind } from '@ct/domain';
import { orgEq, type OrgContext } from '../auth/index';
import { notFound } from '../errors';

/**
 * F-24 — **rotación de los logs internos**, al estilo de un log rotado por tamaño: `jobs` (procesos) y
 * `outbox_events` (envíos a sistemas externos) son los "ficheros activos" y, cuando sus filas ya TERMINADAS superan el
 * umbral, se cierra un lote: su CSV comprimido va a `log_archives` y esas filas se borran de la tabla caliente, que
 * vuelve a empezar. Los lotes anteriores se siguen listando y descargando.
 *
 * Sólo se archiva lo terminado. Una fila PENDING/PROCESSING es trabajo vivo del worker: archivarla sería perderlo.
 */

/** Estados terminales de cada log: lo único archivable. */
const FINISHED_JOBS = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;
const FINISHED_OUTBOX = ['PROCESSED', 'FAILED'] as const;

/** Umbral por defecto de filas terminadas antes de cerrar un lote (decisión del owner: rotar por tamaño). */
export const LOG_ROTATE_ROWS = 5000;

/** Celda CSV segura: entrecomillada siempre y con las comillas dobladas (los errores traen comas y saltos). */
function cell(value: unknown): string {
  if (value == null) return '""';
  const s =
    value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(columns: readonly string[], rows: unknown[][]): string {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(r.map(cell).join(','));
  // BOM (\ufeff) al principio para que Excel abra el CSV como UTF-8 y no rompa los acentos.
  return `\ufeff${lines.join('\n')}\n`;
}

type JobRow = typeof jobs.$inferSelect;
type OutboxRow = typeof outboxEvents.$inferSelect;

const JOB_COLUMNS = [
  'created_at', 'updated_at', 'job_type', 'status', 'attempts', 'max_attempts',
  'available_at', 'completed_at', 'failed_at', 'last_error', 'payload', 'id',
] as const;

/** CSV de procesos. Mismo formato en la descarga del log activo y en los lotes archivados. */
export function jobsToCsv(rows: JobRow[]): string {
  return toCsv(
    JOB_COLUMNS,
    rows.map((j) => [
      j.createdAt, j.updatedAt, j.jobType, j.status, j.attempts, j.maxAttempts,
      j.availableAt, j.completedAt, j.failedAt, j.lastError, j.payload, j.id,
    ]),
  );
}

const OUTBOX_COLUMNS = [
  'created_at', 'event_type', 'aggregate_type', 'aggregate_id', 'status', 'attempts',
  'available_at', 'processed_at', 'last_error', 'payload', 'id',
] as const;

/** CSV de la bandeja de salida (envíos a Notion/Twenty y eventos de dominio). */
export function outboxToCsv(rows: OutboxRow[]): string {
  return toCsv(
    OUTBOX_COLUMNS,
    rows.map((e) => [
      e.createdAt, e.eventType, e.aggregateType, e.aggregateId, e.status, e.attempts,
      e.availableAt, e.processedAt, e.lastError, e.payload, e.id,
    ]),
  );
}

/** Guarda un lote y borra sus filas de la tabla caliente, en una transacción. */
async function archiveBatch(
  db: Database,
  ctx: OrgContext,
  kind: LogArchiveKind,
  rows: { id: string; createdAt: Date }[],
  csv: string,
  deleteRows: (tx: DbOrTx, ids: string[]) => Promise<void>,
): Promise<{ kind: LogArchiveKind; seq: number; rowCount: number; sizeBytes: number }> {
  const content = gzipSync(Buffer.from(csv, 'utf8'));
  const dates = rows.map((r) => r.createdAt.getTime());
  const [{ maxSeq } = { maxSeq: null }] = await db
    .select({ maxSeq: max(logArchives.seq) })
    .from(logArchives)
    .where(and(orgEq(logArchives.organizationId, ctx), eq(logArchives.kind, kind)));
  const seq = (maxSeq ?? 0) + 1;

  return await db.transaction(async (tx) => {
    await tx.insert(logArchives).values({
      organizationId: ctx.organizationId,
      kind,
      seq,
      rangeFrom: new Date(Math.min(...dates)),
      rangeTo: new Date(Math.max(...dates)),
      rowCount: rows.length,
      sizeBytes: content.byteLength,
      content,
    });
    await deleteRows(
      tx,
      rows.map((r) => r.id),
    );
    return { kind, seq, rowCount: rows.length, sizeBytes: content.byteLength };
  });
}

/** Rota el log de PROCESOS si toca. `null` si aún no se ha alcanzado el umbral (caso normal). */
export async function rotateJobLog(db: Database, ctx: OrgContext, opts: { maxRows?: number } = {}) {
  const maxRows = opts.maxRows ?? LOG_ROTATE_ROWS;
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(jobs)
    .where(inArray(jobs.status, [...FINISHED_JOBS]));
  if (Number(n) < maxRows) return null;

  const rows = await db
    .select()
    .from(jobs)
    .where(inArray(jobs.status, [...FINISHED_JOBS]))
    .orderBy(desc(jobs.createdAt));
  if (rows.length === 0) return null;

  return archiveBatch(db, ctx, 'JOBS', rows, jobsToCsv(rows), async (tx, ids) => {
    await tx.delete(jobs).where(inArray(jobs.id, ids));
  });
}

/**
 * Rota el log de la BANDEJA DE SALIDA si toca. Archivable = `PROCESSED` (llegó a su destino) y `FAILED` (agotó los
 * reintentos). Los `FAILED` se archivan igualmente: siguen siendo consultables desde el lote y ya no bloquean nada —
 * el aviso de "envíos fallidos" se apoya en los que están vivos.
 */
export async function rotateOutboxLog(db: Database, ctx: OrgContext, opts: { maxRows?: number } = {}) {
  const maxRows = opts.maxRows ?? LOG_ROTATE_ROWS;
  const where = and(orgEq(outboxEvents.organizationId, ctx), inArray(outboxEvents.status, [...FINISHED_OUTBOX]));
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(outboxEvents).where(where);
  if (Number(n) < maxRows) return null;

  const rows = await db.select().from(outboxEvents).where(where).orderBy(desc(outboxEvents.createdAt));
  if (rows.length === 0) return null;

  return archiveBatch(db, ctx, 'OUTBOX', rows, outboxToCsv(rows), async (tx, ids) => {
    await tx.delete(outboxEvents).where(inArray(outboxEvents.id, ids));
  });
}

/** Lotes archivados (sin el contenido: la lista no descarga megas para pintar cuatro columnas). */
export function listLogArchives(db: Database, ctx: OrgContext, limit = 50) {
  return db
    .select({
      id: logArchives.id,
      kind: logArchives.kind,
      seq: logArchives.seq,
      rangeFrom: logArchives.rangeFrom,
      rangeTo: logArchives.rangeTo,
      rowCount: logArchives.rowCount,
      sizeBytes: logArchives.sizeBytes,
      createdAt: logArchives.createdAt,
    })
    .from(logArchives)
    .where(orgEq(logArchives.organizationId, ctx))
    .orderBy(desc(logArchives.createdAt))
    .limit(limit);
}

/** CSV descomprimido de un lote, para la descarga. */
export async function getLogArchiveCsv(
  db: Database,
  ctx: OrgContext,
  id: string,
): Promise<{ kind: string; seq: number; csv: string }> {
  const [row] = await db
    .select({ kind: logArchives.kind, seq: logArchives.seq, content: logArchives.content })
    .from(logArchives)
    .where(and(eq(logArchives.id, id), orgEq(logArchives.organizationId, ctx)));
  if (!row) throw notFound('log_archive');
  return { kind: row.kind, seq: row.seq, csv: gunzipSync(row.content).toString('utf8') };
}
