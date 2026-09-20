import { and, eq, inArray, ne } from 'drizzle-orm';
import type { Database } from '@ct/db';
import {
  knowledgeInbox,
  knowledgeItems,
  decisions,
  documents,
  assets,
  projects,
  clients,
  services,
} from '@ct/db/schema';
import {
  assertKnowledgeItemTransition,
  assertDecisionTransition,
  assertAssetTransition,
  type KnowledgeItemStatus,
  type DecisionStatus,
  type AssetStatus,
} from '@ct/domain';
import {
  captureKnowledgeSchema,
  promoteInboxSchema,
  updateInboxSchema,
  createKnowledgeItemSchema,
  updateKnowledgeItemSchema,
  createDecisionSchema,
  updateDecisionSchema,
  createDocumentSchema,
  createAssetSchema,
  updateAssetSchema,
} from '@ct/validation';
import { AppError } from '@ct/shared';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { assertNotEditingOwnedFields } from '../integrations/identity';
import { mapDbError, notFound, decisionAlreadySuperseded } from '../errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** created_by_user_id: los syncs corren con ctx.userId='system' (no es UUID) → debe ser null. */
function creatorId(ctx: OrgContext): string | null {
  return UUID_RE.test(ctx.userId) ? ctx.userId : null;
}

async function assertRefInOrg(
  db: Database,
  ctx: OrgContext,
  table: typeof projects | typeof clients | typeof services,
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

// --- Knowledge Inbox ---
export async function captureKnowledge(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = captureKnowledgeSchema.parse(input);
  try {
    const [row] = await db
      .insert(knowledgeInbox)
      .values({ organizationId: ctx.organizationId, status: 'NEW', ...data })
      .returning();
    await recordAudit(db, ctx, { action: 'CAPTURE', entityType: 'knowledge_inbox', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'knowledge_inbox' });
  }
}

/** Convierte una captura del inbox en un KnowledgeItem (DRAFT) y marca el inbox PROCESSED. */
export async function promoteInboxToItem(db: Database, ctx: OrgContext, inboxId: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = promoteInboxSchema.parse(input);
  return db.transaction(async (tx) => {
    const [inbox] = await tx
      .select()
      .from(knowledgeInbox)
      .where(and(eq(knowledgeInbox.id, inboxId), orgEq(knowledgeInbox.organizationId, ctx)));
    if (!inbox) throw notFound('knowledge_inbox');
    if (inbox.status === 'PROCESSED' || inbox.status === 'DISCARDED') {
      throw new AppError({
        code: 'INBOX_ALREADY_RESOLVED',
        kind: 'CONFLICT',
        message: `La captura ya está ${inbox.status}`,
      });
    }
    // Los metadatos se editan y guardan en la propia captura (panel); aquí se leen de la fila con fallbacks.
    const [item] = await tx
      .insert(knowledgeItems)
      .values({
        organizationId: ctx.organizationId,
        title: data.title ?? inbox.title ?? inbox.rawContent.slice(0, 120),
        // El texto capturado pasa a ser el "Resumen" del elemento (se espeja a Notion). El cuerpo largo
        // lo escribe el owner en la página de Notion; CT no gestiona "content".
        summary: data.summary ?? inbox.rawContent,
        knowledgeType: data.knowledgeType ?? inbox.knowledgeType ?? 'NOTE',
        sector: data.sector ?? inbox.sector ?? undefined,
        status: 'DRAFT',
        sourceType: inbox.sourceType,
        sourceUrl: inbox.sourceUrl,
        sourceExternalId: inbox.sourceExternalId,
        createdByUserId: creatorId(ctx),
      })
      .returning();
    await tx
      .update(knowledgeInbox)
      .set({ status: 'PROCESSED', processedAt: new Date(), updatedAt: new Date() })
      .where(eq(knowledgeInbox.id, inboxId));
    // C-1: promover deja rastro en las DOS entidades (el item nuevo y la captura resuelta).
    await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'knowledge_item', entityId: item!.id });
    await recordChangeEvent(tx, ctx, {
      entityType: 'knowledge_inbox',
      entityId: inboxId,
      changeType: 'STATUS',
      previousState: { status: inbox.status },
      newState: { status: 'PROCESSED', promotedTo: item!.id },
    });
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'knowledge_inbox',
      entityId: inboxId,
      metadata: { status: 'PROCESSED', promotedTo: item!.id },
    });
    return item!;
  });
}

/** Edita una captura desde el panel lateral. Solo mientras está NEW (procesadas/descartadas = solo lectura). */
export async function updateInboxItem(db: Database, ctx: OrgContext, inboxId: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateInboxSchema.parse(input);
  const [current] = await db
    .select()
    .from(knowledgeInbox)
    .where(and(eq(knowledgeInbox.id, inboxId), orgEq(knowledgeInbox.organizationId, ctx)));
  if (!current) throw notFound('knowledge_inbox');
  if (current.status !== 'NEW') {
    throw new AppError({
      code: 'INBOX_NOT_EDITABLE',
      kind: 'CONFLICT',
      message: 'La captura ya está resuelta; es de solo lectura.',
    });
  }
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(knowledgeInbox)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(knowledgeInbox.id, inboxId), orgEq(knowledgeInbox.organizationId, ctx)))
      .returning();
    // F-4: diff campo a campo.
    await recordFieldChanges(tx, ctx, {
      entityType: 'knowledge_inbox',
      entityId: inboxId,
      before: current,
      changed: data,
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'knowledge_inbox', entityId: inboxId });
    return row!;
  });
}

export async function discardInboxItem(db: Database, ctx: OrgContext, inboxId: string) {
  requireCan(ctx.role, 'write');
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(knowledgeInbox)
      .set({ status: 'DISCARDED', processedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(knowledgeInbox.id, inboxId), orgEq(knowledgeInbox.organizationId, ctx)))
      .returning();
    if (!row) throw notFound('knowledge_inbox');
    // C-1: descartar una captura también deja rastro.
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'knowledge_inbox',
      entityId: inboxId,
      metadata: { status: 'DISCARDED' },
    });
    return row;
  });
}

/** Borra (definitivo) una captura del inbox. Acción manual del usuario (botón Eliminar del panel). */
export async function deleteInboxItem(db: Database, ctx: OrgContext, inboxId: string) {
  requireCan(ctx.role, 'write');
  const [row] = await db
    .delete(knowledgeInbox)
    .where(and(eq(knowledgeInbox.id, inboxId), orgEq(knowledgeInbox.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('knowledge_inbox');
  await recordAudit(db, ctx, { action: 'DELETE', entityType: 'knowledge_inbox', entityId: inboxId });
  return row;
}

/**
 * Purga (borrado definitivo) las capturas ya resueltas de una org (estados terminales `PROCESSED` y
 * `DISCARDED`): las procesadas viven completas en la biblioteca (la copia en la bandeja sobra) y las
 * descartadas ya no interesan, así que ambas se retiran de la bandeja con la misma frecuencia. Idempotente
 * (una vez borradas, no hay nada que purgar). Contexto SYSTEM (barrido del worker); sin audit por fila.
 */
export async function purgeProcessedInbox(db: Database, ctx: OrgContext): Promise<{ deleted: number }> {
  // Sin ventana de retención A PROPÓSITO (decisión del owner, 2026-09-01): una captura ya procesada vive completa en
  // la biblioteca —su texto pasó al Resumen del elemento en la misma transacción del promote—, así que conservarla
  // sería una segunda copia de la misma información y la bandeja se llenaría. Las descartadas tampoco se guardan.
  // NO añadir aquí una política de retención "por seguridad": ya se propuso y se rechazó (ver FINDINGS F-23).
  const rows = await db
    .delete(knowledgeInbox)
    .where(and(inArray(knowledgeInbox.status, ['PROCESSED', 'DISCARDED']), orgEq(knowledgeInbox.organizationId, ctx)))
    .returning({ id: knowledgeInbox.id });
  return { deleted: rows.length };
}

// --- Knowledge Item ---
export async function createKnowledgeItem(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createKnowledgeItemSchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(knowledgeItems)
        .values({ organizationId: ctx.organizationId, createdByUserId: creatorId(ctx), ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'knowledge_item', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'knowledge_item' });
  }
}

export async function updateKnowledgeItemStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: KnowledgeItemStatus,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.id, id), orgEq(knowledgeItems.organizationId, ctx)));
  if (!current) throw notFound('knowledge_item');
  assertKnowledgeItemTransition(current.status as KnowledgeItemStatus, status);
  const now = new Date();
  // C-1: el cambio de estado deja rastro (audit + change_event). El audit, además, encola el push a Notion.
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(knowledgeItems)
      .set({
        status,
        reviewedAt: status === 'REVIEW' ? (current.reviewedAt ?? now) : current.reviewedAt,
        approvedAt: status === 'APPROVED' ? (current.approvedAt ?? now) : current.approvedAt,
        updatedAt: now,
      })
      .where(and(eq(knowledgeItems.id, id), orgEq(knowledgeItems.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'knowledge_item',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, {
      action: status === 'APPROVED' ? 'APPROVE' : 'UPDATE',
      entityType: 'knowledge_item',
      entityId: id,
      metadata: { status },
    });
    return row!;
  });
}

export async function updateKnowledgeItem(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateKnowledgeItemSchema.parse(input);
  const [current] = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.id, id), orgEq(knowledgeItems.organizationId, ctx)));
  if (!current) throw notFound('knowledge_item');
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(knowledgeItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(knowledgeItems.id, id), orgEq(knowledgeItems.organizationId, ctx)))
      .returning();
    // F-4: diff campo a campo de la edición.
    await recordFieldChanges(tx, ctx, { entityType: 'knowledge_item', entityId: id, before: current, changed: data });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'knowledge_item', entityId: id });
    return row!;
  });
}

// --- Decision ---
export async function createDecision(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createDecisionSchema.parse(input);
  await assertRefInOrg(db, ctx, projects, data.projectId, 'project');
  await assertRefInOrg(db, ctx, services, data.serviceId, 'service');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(decisions)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'decision', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'decision' });
  }
}

export async function updateDecisionStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: DecisionStatus,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)));
  if (!current) throw notFound('decision');
  assertDecisionTransition(current.status as DecisionStatus, status);
  const decidedAt = status === 'APPROVED' ? (current.decidedAt ?? new Date()) : current.decidedAt;
  const decidedByUserId = status === 'APPROVED' ? (current.decidedByUserId ?? ctx.userId) : current.decidedByUserId;
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(decisions)
      .set({ status, decidedAt, decidedByUserId, updatedAt: new Date() })
      .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, { entityType: 'decision', entityId: id, changeType: 'STATUS', previousState: { status: current.status }, newState: { status } });
    await recordAudit(tx, ctx, { action: status === 'APPROVED' ? 'APPROVE' : 'UPDATE', entityType: 'decision', entityId: id, metadata: { status } });
    return row!;
  });
}

/** Edita campos de una decisión (título/contexto/decisión/rationale/relaciones). Emite audit. */
export async function updateDecision(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const { supersedesDecisionId, ...data } = updateDecisionSchema.parse(input);
  const [current] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)));
  if (!current) throw notFound('decision');
  await assertRefInOrg(db, ctx, projects, data.projectId ?? undefined, 'project');
  await assertRefInOrg(db, ctx, services, data.serviceId ?? undefined, 'service');

  // A-2 (ADR-006): fijar "reemplaza a" marca la ANTIGUA como SUPERSEDED y escribe el enlace, todo en una tx
  // (`supersedeDecision` hace ambas cosas). Ponerlo a null sólo desenlaza; el estado de la otra se gestiona aparte.
  if (supersedesDecisionId) await supersedeDecision(db, ctx, supersedesDecisionId, id);

  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(decisions)
      .set({
        ...data,
        ...(supersedesDecisionId === null ? { supersedesDecisionId: null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)))
      .returning();
    // F-4: diff campo a campo de la edición.
    await recordFieldChanges(tx, ctx, { entityType: 'decision', entityId: id, before: current, changed: data });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'decision', entityId: id });
    return row!;
  });
}

/**
 * Marca una decisión como SUPERSEDED y, si se indica `bySupersedingId`, **registra el enlace**: la decisión NUEVA
 * apunta a la ANTIGUA vía `supersedes_decision_id` (A-2 / ADR-006). Ambas cosas en la misma transacción, para que
 * no quede el estado sin el vínculo. Sin `bySupersedingId` se comporta como antes (sólo el estado).
 */
export async function supersedeDecision(
  db: Database,
  ctx: OrgContext,
  id: string,
  bySupersedingId?: string,
) {
  if (!bySupersedingId) return updateDecisionStatus(db, ctx, id, 'SUPERSEDED');
  requireCan(ctx.role, 'write');
  if (bySupersedingId === id) {
    throw new AppError({
      code: 'DECISION_SELF_SUPERSEDE',
      kind: 'VALIDATION',
      message: 'Una decisión no puede reemplazarse a sí misma.',
    });
  }
  const [current] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)));
  if (!current) throw notFound('decision');
  const [superseding] = await db
    .select({ id: decisions.id, supersedesDecisionId: decisions.supersedesDecisionId })
    .from(decisions)
    .where(and(eq(decisions.id, bySupersedingId), orgEq(decisions.organizationId, ctx)));
  if (!superseding) throw notFound('decision');
  // ¿La antigua ya la reemplazó OTRA decisión? (la cadena es 1→1; dos reemplazos compiten)
  const [other] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(
      and(
        eq(decisions.supersedesDecisionId, id),
        orgEq(decisions.organizationId, ctx),
        ne(decisions.id, bySupersedingId),
      ),
    );
  if (other) throw decisionAlreadySuperseded();
  assertDecisionTransition(current.status as DecisionStatus, 'SUPERSEDED');

  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(decisions)
      .set({ status: 'SUPERSEDED', updatedAt: new Date() })
      .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)))
      .returning();
    await tx
      .update(decisions)
      .set({ supersedesDecisionId: id, updatedAt: new Date() })
      .where(and(eq(decisions.id, bySupersedingId), orgEq(decisions.organizationId, ctx)));
    await recordChangeEvent(tx, ctx, {
      entityType: 'decision',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status: 'SUPERSEDED', supersededBy: bySupersedingId },
    });
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'decision',
      entityId: id,
      metadata: { status: 'SUPERSEDED', supersededBy: bySupersedingId },
    });
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'decision',
      entityId: bySupersedingId,
      metadata: { supersedes: id },
    });
    return row!;
  });
}

// --- Document (metadata + referencia externa; doc 5 §23 / ERRATA-014) ---
export async function createDocument(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createDocumentSchema.parse(input);
  await assertRefInOrg(db, ctx, projects, data.projectId, 'project');
  await assertRefInOrg(db, ctx, clients, data.clientId, 'client');
  try {
    const [row] = await db
      .insert(documents)
      .values({ organizationId: ctx.organizationId, ...data })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'document', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'document' });
  }
}

// --- Asset ---
export async function createAsset(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createAssetSchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(assets)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'asset', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'asset' });
  }
}

export async function updateAsset(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateAssetSchema.parse(input);
  const [current] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), orgEq(assets.organizationId, ctx)));
  if (!current) throw notFound('asset');
  // Inmutabilidad por procedencia: si el asset vino de GitHub, sus campos propiedad de GitHub no se editan aquí.
  await assertNotEditingOwnedFields(db, ctx, 'asset', id, data);
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(assets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(assets.id, id), orgEq(assets.organizationId, ctx)))
      .returning();
    // F-4: diff campo a campo de la edición.
    await recordFieldChanges(tx, ctx, { entityType: 'asset', entityId: id, before: current, changed: data });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'asset', entityId: id });
    return row!;
  });
}

export async function updateAssetStatus(db: Database, ctx: OrgContext, id: string, status: AssetStatus) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), orgEq(assets.organizationId, ctx)));
  if (!current) throw notFound('asset');
  assertAssetTransition(current.status as AssetStatus, status);
  // C-1: el cambio de estado deja rastro (audit + change_event) y propaga a Notion vía el audit.
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(assets)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(assets.id, id), orgEq(assets.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'asset',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'asset', entityId: id, metadata: { status } });
    return row!;
  });
}
