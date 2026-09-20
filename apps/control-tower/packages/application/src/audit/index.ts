import { and, desc, eq } from 'drizzle-orm';
import type { Database, DbOrTx } from '@ct/db';
import { auditLogs, changeEvents } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';
import { queueNotionPush, queueTwentyPush } from '../outbox/index';

/** Entidades reflejadas a Notion (para el push en tiempo real de Fase 5). */
const NOTION_MIRRORED = new Set([
  'decision',
  'knowledge_item',
  'asset',
  'strategic_area',
  'capability',
  'service',
  'goal',
  'project',
  'resource',
  'learning_item',
  'review_item',
]);

/** Entidades con write-back a Twenty (E-1): CT empuja sus campos gestionados al editarlas un USER.
 *  `task` empuja SOLO la fecha (CT es dueño de `dueDate`; el título lo posee Twenty). */
const TWENTY_MIRRORED = new Set(['client', 'contact', 'opportunity', 'task']);

/**
 * Auditoría (doc 5 §30/§31, ERRATA-013). Dos conceptos SEPARADOS:
 *  - `audit_logs`  = quién hizo qué (actor + acción).
 *  - `change_events` = cómo cambió el estado de una entidad (diff previous→new).
 * Ambos son append-only (no se borran). Usables dentro de una transacción (DbOrTx).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Deriva el actor del contexto: usuario real (UUID) → USER; si no (p. ej. jobs) → SYSTEM. */
function actor(ctx: OrgContext): { actorType: string; actorId: string | null } {
  return UUID_RE.test(ctx.userId)
    ? { actorType: 'USER', actorId: ctx.userId }
    : { actorType: 'SYSTEM', actorId: null };
}

/**
 * ¿El contexto es del sistema (worker/sync/barridos) y no de una persona? Misma regla que la auditoría — un
 * `userId` que no es UUID (`'system'`) — expuesta para los comandos que **sólo** puede ejecutar el sync, como
 * `createOpportunity` (las oportunidades nacen en Twenty, no en CT).
 */
export function isSystemActor(ctx: OrgContext): boolean {
  return actor(ctx).actorType === 'SYSTEM';
}

export async function recordAudit(
  db: DbOrTx,
  ctx: OrgContext,
  e: { action: string; entityType: string; entityId?: string; metadata?: unknown },
): Promise<void> {
  const a = actor(ctx);
  await db.insert(auditLogs).values({
    organizationId: ctx.organizationId,
    actorType: a.actorType,
    actorUserId: a.actorId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    metadata: (e.metadata as object) ?? null,
  });
  // Push en tiempo real a Notion (Fase 5): sólo acciones de USUARIO sobre entidades reflejadas (el sync es SYSTEM → no re-emite).
  if (a.actorType === 'USER' && e.entityId && e.action !== 'DELETE' && NOTION_MIRRORED.has(e.entityType)) {
    await queueNotionPush(db, ctx, e.entityType, e.entityId);
  }
  // Write-back a Twenty (E-1): sólo EDICIONES de USUARIO (no CREATE, alcance "solo actualizar existentes"; no DELETE)
  // sobre client/contact/opportunity. El sync es SYSTEM → no re-emite (evita bucles).
  if (a.actorType === 'USER' && e.entityId && e.action !== 'CREATE' && e.action !== 'DELETE' && TWENTY_MIRRORED.has(e.entityType)) {
    await queueTwentyPush(db, ctx, e.entityType, e.entityId);
  }
}

export async function recordChangeEvent(
  db: DbOrTx,
  ctx: OrgContext,
  e: { entityType: string; entityId: string; changeType: string; previousState?: unknown; newState?: unknown },
): Promise<void> {
  const a = actor(ctx);
  await db.insert(changeEvents).values({
    organizationId: ctx.organizationId,
    entityType: e.entityType,
    entityId: e.entityId,
    changeType: e.changeType,
    previousState: (e.previousState as object) ?? null,
    newState: (e.newState as object) ?? null,
    actorType: a.actorType,
    actorId: a.actorId,
  });
}

/**
 * F-4 — historial CAMPO A CAMPO de las ediciones de metadatos. Los `updateX` ya registraban `audit_log`
 * (quién tocó qué entidad) pero no el diff, así que no se podía responder "¿qué cambió y desde qué valor?".
 *
 * Compara los campos que el comando va a escribir (`changed`, el mismo objeto `set` del UPDATE) con la fila
 * previa (`before`) y emite UN change_event `FIELDS` con **sólo los campos que realmente cambian**. Si no cambia
 * nada, no escribe nada (el autoguardado por campo del panel dispara PATCH con frecuencia; llenar la tabla de
 * eventos vacíos la haría inútil). `updatedAt` se ignora siempre: cambia en todos los UPDATE por definición.
 *
 * Devuelve `true` si emitió un evento.
 */
export async function recordFieldChanges(
  db: DbOrTx,
  ctx: OrgContext,
  e: {
    entityType: string;
    entityId: string;
    before: Record<string, unknown>;
    changed: Record<string, unknown>;
  },
): Promise<boolean> {
  const previousState: Record<string, unknown> = {};
  const newState: Record<string, unknown> = {};
  for (const [key, next] of Object.entries(e.changed)) {
    if (key === 'updatedAt') continue;
    const prev = e.before[key];
    if (sameValue(prev, next)) continue;
    previousState[key] = plain(prev);
    newState[key] = plain(next);
  }
  if (Object.keys(newState).length === 0) return false;
  await recordChangeEvent(db, ctx, {
    entityType: e.entityType,
    entityId: e.entityId,
    changeType: 'FIELDS',
    previousState,
    newState,
  });
  return true;
}

/** Valor comparable/serializable: las fechas viajan como ISO y `undefined` se normaliza a null. */
function plain(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  return v ?? null;
}

/** Igualdad laxa suficiente para un diff de campos (primitivos, fechas y jsonb pequeños). */
function sameValue(a: unknown, b: unknown): boolean {
  const pa = plain(a);
  const pb = plain(b);
  if (pa === pb) return true;
  if (pa !== null && pb !== null && (typeof pa === 'object' || typeof pb === 'object')) {
    return JSON.stringify(pa) === JSON.stringify(pb);
  }
  return false;
}

/**
 * F-4 — historial de cambios de UNA entidad (para el bloque "Historial" del panel lateral). Devuelve los
 * `change_events` más recientes: cambios de estado (`STATUS`) y diffs de campos (`FIELDS`).
 */
export function listEntityChanges(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  entityId: string,
  limit = 20,
) {
  return db
    .select({
      id: changeEvents.id,
      changeType: changeEvents.changeType,
      previousState: changeEvents.previousState,
      newState: changeEvents.newState,
      actorType: changeEvents.actorType,
      createdAt: changeEvents.createdAt,
    })
    .from(changeEvents)
    .where(
      and(
        orgEq(changeEvents.organizationId, ctx),
        eq(changeEvents.entityType, entityType),
        eq(changeEvents.entityId, entityId),
      ),
    )
    .orderBy(desc(changeEvents.createdAt))
    .limit(limit);
}

/** Actividad reciente de la organización (Home / auditoría general). */
export function listRecentAudit(db: Database, ctx: OrgContext, limit = 10) {
  return db
    .select()
    .from(auditLogs)
    .where(orgEq(auditLogs.organizationId, ctx))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
