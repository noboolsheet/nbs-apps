import { and, eq, lt, isNull, isNotNull, inArray } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { clients, contacts, opportunities, tasks } from '@ct/db/schema';
import {
  slugify,
  assertOpportunityStageTransition,
  deriveOpportunityStatus,
  isOpportunityStageTerminal,
  CLOSED_OPPORTUNITY_STAGES,
  type OpportunityStage,
} from '@ct/domain';
import {
  createClientSchema,
  updateClientSchema,
  createContactSchema,
  updateContactSchema,
  createOpportunitySchema,
} from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordChangeEvent, recordFieldChanges, isSystemActor } from '../audit/index';
import { emitOutbox } from '../outbox/index';
import { mapDbError, notFound, opportunityArchived, opportunityExternalOnly } from '../errors';

/** Casos de uso del módulo CRM. Autorizan, validan, aplican dominio y filtran por organización. */

/** Verifica que una entidad relacionada (client/contact) pertenece a la organización. */
async function assertBelongs(
  db: Database,
  ctx: OrgContext,
  table: typeof clients | typeof contacts,
  id: string | undefined,
  entity: string,
) {
  if (!id) return;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), orgEq(table.organizationId, ctx)));
  if (!row) throw notFound(entity);
}


export async function createClient(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createClientSchema.parse(input);
  const slug = data.slug ?? slugify(data.name);
  try {
    const [row] = await db
      .insert(clients)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        slug,
        status: data.status,
        industry: data.industry,
        websiteUrl: data.websiteUrl,
        notes: data.notes,
      })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'client', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'client' });
  }
}

export async function updateClient(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateClientSchema.parse(input);
  const [current] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), orgEq(clients.organizationId, ctx)));
  if (!current) throw notFound('client');
  try {
    // Atomicidad: el UPDATE y el recordAudit (que encola el write-back a Twenty) van en la MISMA transacción,
    // así no puede quedar la entidad cambiada sin el push encolado (sin deriva silenciosa).
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(clients)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(clients.id, id), orgEq(clients.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'client', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'client', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'client' });
  }
}

export async function updateContact(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateContactSchema.parse(input);
  const [current] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), orgEq(contacts.organizationId, ctx)));
  if (!current) throw notFound('contact');
  if (data.clientId) await assertBelongs(db, ctx, clients, data.clientId, 'client');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(contacts)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(contacts.id, id), orgEq(contacts.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'contact', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'contact', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'contact' });
  }
}

export async function createContact(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createContactSchema.parse(input);
  await assertBelongs(db, ctx, clients, data.clientId, 'client');
  try {
    const [row] = await db
      .insert(contacts)
      .values({ organizationId: ctx.organizationId, ...data })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'contact', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'contact' });
  }
}

/**
 * Crea una oportunidad. **Sólo la llama el sync de Twenty** (owner 2026-09-02: CT es una máquina de estados para
 * oportunidades; nacen en Twenty). El guard por actor es defensa en profundidad — la ruta `POST /opportunities` ya
 * no existe—, de modo que ninguna vista ni comando futuro pueda colar una creación de usuario por descuido.
 */
export async function createOpportunity(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  if (!isSystemActor(ctx)) throw opportunityExternalOnly();
  const data = createOpportunitySchema.parse(input);
  await assertBelongs(db, ctx, clients, data.clientId, 'client');
  await assertBelongs(db, ctx, contacts, data.primaryContactId, 'contact');
  const status = deriveOpportunityStatus(data.stage);
  try {
    const [row] = await db
      .insert(opportunities)
      .values({
        organizationId: ctx.organizationId,
        name: data.name,
        clientId: data.clientId,
        primaryContactId: data.primaryContactId,
        stage: data.stage,
        status,
        estimatedValue: data.estimatedValue?.toFixed(2),
        currencyCode: data.currencyCode,
        expectedCloseDate: data.expectedCloseDate?.toISOString().slice(0, 10),
        source: data.source,
        notes: data.notes,
        closedAt: isOpportunityStageTerminal(data.stage) ? new Date() : null,
      })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'opportunity', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'opportunity' });
  }
}

/** Mueve el stage de una oportunidad (Kanban). Deriva status y closed_at. */
export async function changeOpportunityStage(
  db: Database,
  ctx: OrgContext,
  id: string,
  stage: OpportunityStage,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, id), orgEq(opportunities.organizationId, ctx)));
  if (!current) throw notFound('opportunity');
  if (current.archivedAt) throw opportunityArchived(); // archivada = congelada
  assertOpportunityStageTransition(current.stage as OpportunityStage, stage);
  const status = deriveOpportunityStatus(stage);
  // Transactional Outbox: el cambio de stage y (si gana) el evento de automatización se escriben atómicamente.
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(opportunities)
      .set({
        stage,
        status,
        // closedAt = momento en que ENTRÓ a su estado terminal actual. Se reinicia al cambiar de terminal
        // (p. ej. WON→CLOSED) para que el auto-archivado (7 días) cuente desde el cierre, no desde la ganada.
        closedAt: isOpportunityStageTerminal(stage) ? (current.stage === stage ? current.closedAt : new Date()) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(opportunities.id, id), orgEq(opportunities.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, { entityType: 'opportunity', entityId: id, changeType: 'STAGE', previousState: { stage: current.stage }, newState: { stage } });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'opportunity', entityId: id, metadata: { stage } });
    // Automatización por evento (Fase 6, ERRATA-009: sin constructor visual): al GANAR una oportunidad se
    // encola la creación de su proyecto. El handler es idempotente (no crea si ya hay proyecto de esa oportunidad).
    if (status === 'WON' && current.status !== 'WON') {
      await emitOutbox(tx, {
        organizationId: ctx.organizationId,
        eventType: 'opportunity.won',
        aggregateType: 'opportunity',
        aggregateId: id,
        payload: {},
      });
    }
    return row!;
  });
}

/**
 * Archiva en lote las oportunidades de la columna «Cerradas» (stage LOST u ONBOARDED) cuya `closedAt` es anterior a
 * `olderThanDays` (una semana por defecto). **Las GANADAS (WON) NO se archivan solas** (owner 2026-08-16: "Ganada no
 * es un estado final"): se quedan en el tablero, en la columna «Negociación», hasta que el onboarding termina y se
 * mueven a ONBOARDED. Retira del
 * Kanban las oportunidades ya descartadas SIN borrarlas: siguen en la vista "Archivadas" y son restaurables. El
 * registro queda en `audit_logs` (ARCHIVE). Pensado para el barrido del worker (contexto SYSTEM → no dispara push a
 * Notion/Twenty). Idempotente: `isNull(archivedAt)` garantiza que no re-archiva ni re-audita las que ya lo están.
 */
export async function archiveClosedOpportunities(
  db: Database,
  ctx: OrgContext,
  opts: { olderThanDays: number; now?: Date },
): Promise<{ archived: number }> {
  requireCan(ctx.role, 'delete');
  if (!opts.olderThanDays || opts.olderThanDays <= 0) return { archived: 0 };
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - opts.olderThanDays * 86_400_000);
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .update(opportunities)
        .set({ archivedAt: now })
        .where(
          and(
            orgEq(opportunities.organizationId, ctx),
            // Toda la columna «Cerradas»: el cierre ganado (ONBOARDED) y el perdido (LOST). WON queda fuera.
            inArray(opportunities.stage, [...CLOSED_OPPORTUNITY_STAGES]),
            isNull(opportunities.archivedAt),
            isNotNull(opportunities.closedAt),
            lt(opportunities.closedAt, cutoff),
          ),
        )
        .returning({ id: opportunities.id, name: opportunities.name });
      if (rows.length > 0) {
        // Las tareas de preventa se archivan JUNTO con su oportunidad (quedan congeladas y fuera de las listas).
        await tx
          .update(tasks)
          .set({ archivedAt: now })
          .where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.opportunityId, rows.map((r) => r.id)), isNull(tasks.archivedAt)));
      }
      for (const r of rows) {
        await recordAudit(tx, ctx, {
          action: 'ARCHIVE',
          entityType: 'opportunity',
          entityId: r.id,
          metadata: { reason: 'auto-archive', name: r.name, olderThanDays: opts.olderThanDays },
        });
      }
      return { archived: rows.length };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'opportunity' });
  }
}
