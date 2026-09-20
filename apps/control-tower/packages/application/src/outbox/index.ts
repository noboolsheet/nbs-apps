import { and, eq, lt, lte, gte, asc, desc, inArray, count, sql } from 'drizzle-orm';
import type { Database, DbOrTx } from '@ct/db';
import { outboxEvents } from '@ct/db/schema';
import { logger } from '@ct/shared';
import { STUCK_STALE_MS } from '../jobs/index';
import { orgEq, type OrgContext } from '../auth/index';

/**
 * Transactional Outbox (doc 3 §3A.5, doc 4 §15). `emitOutbox` se inserta DENTRO de la misma
 * transacción que el cambio de estado del dominio → sin dual-write no fiable. Un dispatcher
 * (en el worker) reclama los eventos PENDING (SKIP LOCKED) y ejecuta los handlers registrados
 * (p. ej. `notion.push`, `twenty.push`, `opportunity.won`). Los eventos sin handler propio los recoge el
 * comodín `*`, que sólo loguea.
 */

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type OutboxHandler = (event: OutboxEvent, db: Database) => Promise<void>;
export type OutboxRegistry = Record<string, OutboxHandler>;

export interface EmitOutboxInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  organizationId?: string | null;
}

/** Inserta un evento de outbox. DEBE llamarse con la `tx` del cambio de dominio (atomicidad). */
export async function emitOutbox(tx: DbOrTx, e: EmitOutboxInput): Promise<void> {
  await tx.insert(outboxEvents).values({
    organizationId: e.organizationId ?? null,
    eventType: e.eventType,
    aggregateType: e.aggregateType,
    aggregateId: e.aggregateId,
    payload: e.payload as object,
    status: 'PENDING',
    availableAt: new Date(),
  });
}

/**
 * Encola un push en tiempo real a Notion de la entidad `entityType/id` (Fase 5/E-1). Se llama dentro de los
 * commands de CT tras crear/actualizar una entidad reflejada. **No emite para acciones del sync** (`userId='system'`)
 * para evitar bucles (el sync ya escribe en Notion; re-emitir volvería a empujar).
 */
export async function queueNotionPush(
  tx: DbOrTx,
  actor: { userId: string; organizationId: string },
  entityType: string,
  entityId: string,
): Promise<void> {
  if (actor.userId === 'system') return;
  await emitOutbox(tx, {
    eventType: 'notion.push',
    aggregateType: entityType,
    aggregateId: entityId,
    payload: {},
    organizationId: actor.organizationId,
  });
}

/**
 * Encola un write-back a Twenty de la entidad `entityType/id` (E-1). Igual que el de Notion: NO emite para el sync
 * (`userId='system'`) → sin bucles (el pull escribe en CT como SYSTEM y no re-empuja).
 */
export async function queueTwentyPush(
  tx: DbOrTx,
  actor: { userId: string; organizationId: string },
  entityType: string,
  entityId: string,
): Promise<void> {
  if (actor.userId === 'system') return;
  await emitOutbox(tx, {
    eventType: 'twenty.push',
    aggregateType: entityType,
    aggregateId: entityId,
    payload: {},
    organizationId: actor.organizationId,
  });
}

const MAX_OUTBOX_ATTEMPTS = 5;

/** Procesa un lote de eventos de outbox PENDING. Devuelve cuántos procesó. */
export async function dispatchOutboxOnce(
  db: Database,
  registry: OutboxRegistry,
  limit = 20,
): Promise<number> {
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(outboxEvents)
      .where(and(eq(outboxEvents.status, 'PENDING'), lte(outboxEvents.availableAt, new Date())))
      .orderBy(asc(outboxEvents.availableAt))
      .limit(limit)
      .for('update', { skipLocked: true });
    if (rows.length === 0) return [] as OutboxEvent[];
    await tx
      .update(outboxEvents)
      // `availableAt = now` marca el "reclamado en" (el outbox no tiene lockedAt): lo usa el reaper para
      // detectar eventos colgados en PROCESSING si el worker muere antes de terminar el bucle de handlers.
      .set({ status: 'PROCESSING', availableAt: new Date() })
      .where(inArray(outboxEvents.id, rows.map((r) => r.id)));
    return rows;
  });

  for (const ev of claimed) {
    const log = logger.child({ task: 'outbox', eventId: ev.id, eventType: ev.eventType });
    try {
      const handler = registry[ev.eventType] ?? registry['*'];
      if (handler) await handler(ev, db);
      else log.debug('outbox event sin handler (no-op)');
      await db
        .update(outboxEvents)
        .set({ status: 'PROCESSED', processedAt: new Date() })
        .where(eq(outboxEvents.id, ev.id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const nextAttempts = ev.attempts + 1;
      if (nextAttempts >= MAX_OUTBOX_ATTEMPTS) {
        await db.update(outboxEvents).set({ status: 'FAILED', attempts: nextAttempts, lastError: msg }).where(eq(outboxEvents.id, ev.id));
      } else {
        const backoffSec = Math.min(300, 2 ** ev.attempts);
        await db
          .update(outboxEvents)
          .set({ status: 'PENDING', attempts: nextAttempts, lastError: msg, availableAt: new Date(Date.now() + backoffSec * 1000) })
          .where(eq(outboxEvents.id, ev.id));
      }
      log.warn('outbox handler failed', { error: msg });
    }
  }
  return claimed.length;
}

/**
 * Reaper de eventos de outbox COLGADOS: en PROCESSING con `availableAt` (= reclamado en) más viejo que `staleMs`
 * → el worker murió a mitad del bucle de handlers. Se re-encola (→ PENDING, disponible ya) o se rinde (→ FAILED)
 * según los intentos, incrementando `attempts` (cuenta como un intento). Los handlers (notion/twenty push,
 * opportunity.won) son idempotentes, así que reprocesar es seguro. Idempotente y seguro de correr a menudo.
 */
export async function reapStuckOutbox(
  db: Database,
  opts?: { staleMs?: number; now?: Date },
): Promise<{ requeued: number; failed: number }> {
  const now = opts?.now ?? new Date();
  const cutoff = new Date(now.getTime() - (opts?.staleMs ?? STUCK_STALE_MS));
  // Si al reencolar `attempts+1` alcanza el máximo → FAILED; si no → PENDING disponible ya.
  const failed = await db
    .update(outboxEvents)
    .set({ status: 'FAILED', attempts: sql`${outboxEvents.attempts} + 1`, lastError: 'Reaped: PROCESSING colgado; intentos agotados' })
    .where(and(eq(outboxEvents.status, 'PROCESSING'), lt(outboxEvents.availableAt, cutoff), gte(outboxEvents.attempts, MAX_OUTBOX_ATTEMPTS - 1)))
    .returning({ id: outboxEvents.id });
  const requeued = await db
    .update(outboxEvents)
    .set({ status: 'PENDING', attempts: sql`${outboxEvents.attempts} + 1`, availableAt: now, lastError: 'Reaped: PROCESSING colgado; reencolado' })
    .where(and(eq(outboxEvents.status, 'PROCESSING'), lt(outboxEvents.availableAt, cutoff), lt(outboxEvents.attempts, MAX_OUTBOX_ATTEMPTS - 1)))
    .returning({ id: outboxEvents.id });
  return { requeued: requeued.length, failed: failed.length };
}

export async function outboxStatusCounts(db: Database) {
  const rows = await db.select({ status: outboxEvents.status, n: count() }).from(outboxEvents).groupBy(outboxEvents.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

/**
 * IDs de las entidades de `aggregateType` que tienen un push a `provider` **sin completar** (PENDING/PROCESSING o
 * FAILED). Lo usa el pull de Twenty para **no pisar un cambio local que todavía no ha llegado al origen**: si el
 * write-back falló (p. ej. Twenty rechaza el valor), el sync reescribiría la fila con el valor viejo y el cambio del
 * usuario desaparecería sin dejar rastro — que es justo lo que reportó el owner con los estados de oportunidad.
 */
export async function pendingPushTargets(
  db: Database,
  organizationId: string,
  eventType: string,
  aggregateType: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ id: outboxEvents.aggregateId })
    .from(outboxEvents)
    .where(
      and(
        eq(outboxEvents.organizationId, organizationId),
        eq(outboxEvents.eventType, eventType),
        eq(outboxEvents.aggregateType, aggregateType),
        // DISCARDED queda fuera a propósito: es un envío que el owner dio por cerrado, así que ya no debe
        // impedir que el pull actualice esa entidad desde el origen.
        inArray(outboxEvents.status, ['PENDING', 'PROCESSING', 'FAILED']),
      ),
    );
  return new Set(rows.map((r) => r.id));
}

/** Últimos envíos FALLIDOS (con su motivo), para poder verlos y reintentarlos desde la app. */
export function listFailedOutbox(db: Database, organizationId: string, limit = 20) {
  return db
    .select({
      id: outboxEvents.id,
      eventType: outboxEvents.eventType,
      aggregateType: outboxEvents.aggregateType,
      aggregateId: outboxEvents.aggregateId,
      attempts: outboxEvents.attempts,
      lastError: outboxEvents.lastError,
      createdAt: outboxEvents.createdAt,
    })
    .from(outboxEvents)
    .where(and(eq(outboxEvents.organizationId, organizationId), eq(outboxEvents.status, 'FAILED')))
    .orderBy(desc(outboxEvents.createdAt))
    .limit(limit);
}

/**
 * Reencola un envío fallido (attempts a 0, disponible ya). Para el botón «Reintentar»: arreglas la causa en el
 * sistema externo y vuelves a lanzarlo sin tocar la base de datos a mano.
 */
export async function retryFailedOutbox(db: Database, organizationId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(outboxEvents)
    .set({ status: 'PENDING', attempts: 0, availableAt: new Date(), lastError: null })
    .where(
      and(
        eq(outboxEvents.id, id),
        eq(outboxEvents.organizationId, organizationId),
        eq(outboxEvents.status, 'FAILED'),
      ),
    )
    .returning({ id: outboxEvents.id });
  return rows.length > 0;
}

/**
 * Histórico completo de la bandeja de salida para exportar (log ACTIVO; los lotes rotados se descargan aparte).
 * `limit` es un tope de seguridad para no cargar en memoria una tabla enorme.
 */
export function listOutboxForExport(db: Database, ctx: OrgContext, limit = 5000) {
  return db
    .select()
    .from(outboxEvents)
    .where(orgEq(outboxEvents.organizationId, ctx))
    .orderBy(desc(outboxEvents.createdAt))
    .limit(limit);
}

/**
 * Marca un envío fallido como **descartado**: ya no hace falta enviarlo (p. ej. el dato se corrigió a mano en el
 * sistema externo). No se borra —queda el registro de que ocurrió y su motivo— pero deja de contar como pendiente:
 * desaparece de los avisos y el pull vuelve a poder actualizar esa entidad desde el origen.
 */
export async function discardFailedOutbox(db: Database, organizationId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(outboxEvents)
    .set({ status: 'DISCARDED', processedAt: new Date() })
    .where(
      and(
        eq(outboxEvents.id, id),
        eq(outboxEvents.organizationId, organizationId),
        eq(outboxEvents.status, 'FAILED'),
      ),
    )
    .returning({ id: outboxEvents.id });
  return rows.length > 0;
}
