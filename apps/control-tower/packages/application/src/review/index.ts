import { and, asc, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { reviewItems } from '@ct/db/schema';
import { isReviewItemFrozen, type ReviewItemStatus } from '@ct/domain';
import { createReviewItemSchema, updateReviewItemSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { AppError } from '@ct/shared';
import { createKnowledgeItem } from '../knowledge/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound, reviewItemFrozen } from '../errors';
import { rowCap } from '../list-limit';

/**
 * «Por revisar»: cola de cosas que quieres leer o ver. Se espeja a Notion en los dos sentidos (el `recordAudit` de
 * cada escritura de USUARIO encola el push; el sync trae lo que se cree allí).
 */

async function loadItem(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(reviewItems)
    .where(and(eq(reviewItems.id, id), orgEq(reviewItems.organizationId, ctx)));
  if (!row) throw notFound('review_item');
  return row;
}

export async function createReviewItem(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createReviewItemSchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(reviewItems)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'review_item', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'review_item' });
  }
}

export async function updateReviewItem(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateReviewItemSchema.parse(input);
  const current = await loadItem(db, ctx, id);
  // Congelado al marcarlo REVISADO: editar el título, el enlace o las notas después de haberlo dado por
  // revisado dejaría el registro diciendo que revisaste algo que ya no es lo que hay.
  if (isReviewItemFrozen(current.status as ReviewItemStatus)) throw reviewItemFrozen();
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(reviewItems)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(reviewItems.id, id), orgEq(reviewItems.organizationId, ctx)))
        .returning();
      await recordFieldChanges(tx, ctx, { entityType: 'review_item', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'review_item', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'review_item' });
  }
}

/**
 * Cambia el estado. `reviewed_at` se sella al marcarlo REVISADO y se limpia si vuelve a la cola.
 *
 * **REVISADO no tiene marcha atrás** (`isReviewItemFrozen`): volver a la cola borraría el `reviewed_at` y
 * dejaría en la cola un recurso que quizá ya está en la biblioteca. Se permite el no-op (REVIEWED→REVIEWED)
 * para que reenviar el mismo estado no reviente.
 */
export async function updateReviewItemStatus(db: Database, ctx: OrgContext, id: string, status: ReviewItemStatus) {
  requireCan(ctx.role, 'write');
  const current = await loadItem(db, ctx, id);
  if (isReviewItemFrozen(current.status as ReviewItemStatus) && status !== current.status) throw reviewItemFrozen();
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(reviewItems)
        .set({
          status,
          reviewedAt: status === 'REVIEWED' ? (current.reviewedAt ?? new Date()) : null,
          updatedAt: new Date(),
        })
        .where(and(eq(reviewItems.id, id), orgEq(reviewItems.organizationId, ctx)))
        .returning();
      await recordChangeEvent(tx, ctx, {
        entityType: 'review_item',
        entityId: id,
        changeType: 'STATUS',
        previousState: { status: current.status },
        newState: { status },
      });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'review_item', entityId: id, metadata: { status } });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'review_item' });
  }
}

/** Cola completa (sin archivar): primero lo pendiente y, dentro, lo más reciente. */
export function listReviewItems(db: Database, ctx: OrgContext, filter?: { status?: ReviewItemStatus }, limit?: number) {
  return db
    .select()
    .from(reviewItems)
    .where(
      and(
        orgEq(reviewItems.organizationId, ctx),
        isNull(reviewItems.archivedAt),
        filter?.status ? eq(reviewItems.status, filter.status) : undefined,
      ),
    )
    .orderBy(asc(reviewItems.status), desc(reviewItems.createdAt))
    .limit(rowCap(limit));
}

export async function getReviewItem(db: Database, ctx: OrgContext, id: string) {
  return loadItem(db, ctx, id);
}

/**
 * **Procesar → biblioteca**: crea el elemento de conocimiento a partir de un recurso ya REVISADO y lo enlaza.
 *
 * Entra **APROBADO**, no como borrador: llegar aquí significa que ya lo leíste/viste y decidiste que merece estar en
 * la biblioteca — pasarlo por «borrador» otra vez sería repetir un trabajo ya hecho.
 *
 * Sólo desde `REVIEWED` (lo que aún no has revisado no puede "haberse decidido"), y **una sola vez**: el enlace
 * `knowledge_item_id` evita duplicar el mismo recurso en la biblioteca si se pulsa dos veces.
 */
export async function promoteReviewItemToKnowledge(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'write');
  const current = await loadItem(db, ctx, id);
  if (current.status !== 'REVIEWED') {
    throw new AppError({
      code: 'REVIEW_ITEM_NOT_REVIEWED',
      kind: 'CONFLICT',
      message: 'Sólo se pasan a la biblioteca los recursos ya marcados como revisados.',
    });
  }
  if (current.knowledgeItemId) {
    throw new AppError({
      code: 'REVIEW_ITEM_ALREADY_PROMOTED',
      kind: 'CONFLICT',
      message: 'Este recurso ya está en la biblioteca.',
    });
  }

  const item = await createKnowledgeItem(db, ctx, {
    title: current.title,
    summary: current.notes ?? undefined,
    // Es material externo que se consulta: en la biblioteca vive como REFERENCIA con su enlace.
    knowledgeType: 'REFERENCE',
    sector: current.sector ?? undefined,
    status: 'APPROVED',
    sourceType: 'REVIEW',
    sourceUrl: current.url ?? undefined,
  });

  await db.transaction(async (tx) => {
    await tx
      .update(reviewItems)
      .set({ knowledgeItemId: item.id, updatedAt: new Date() })
      .where(and(eq(reviewItems.id, id), orgEq(reviewItems.organizationId, ctx)));
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'review_item',
      entityId: id,
      metadata: { promotedTo: item.id },
    });
  });
  return item;
}

/**
 * Purga los recursos ya resueltos más antiguos que la retención configurada. Lo pendiente no se toca nunca,
 * y sin política (`null`/0) no se borra nada: por defecto se conserva.
 *
 * **Qué se borra, exactamente:**
 * - `DISCARDED` — siempre. Descartar es decir «esto no me interesa»; no hay nada que preservar.
 * - `REVIEWED` **sólo si ya está en la biblioteca** (`knowledge_item_id` no nulo). Un recurso revisado y NO
 *   procesado es la única copia que queda de él: su título, su enlace y tus notas viven ahí y en ningún otro
 *   sitio. Borrarlo por antigüedad era **perder información** — el comentario anterior daba por hecho que todo
 *   lo revisado estaba ya en la biblioteca, y no es cierto: procesar es un paso manual y explícito.
 *
 * Consecuencia buscada: un revisado sin procesar **se queda para siempre** hasta que decidas. Es lo correcto —
 * la retención está para tirar lo resuelto, no para tomar la decisión por ti. Se ve en «Por revisar», pestaña
 * Hechos, con el botón «Procesar» todavía disponible.
 */
export async function purgeReviewedItems(
  db: Database,
  ctx: OrgContext,
  opts: { retentionDays?: number | null; now?: Date } = {},
): Promise<{ deleted: number }> {
  requireCan(ctx.role, 'delete');
  const days = opts.retentionDays;
  if (days == null || days <= 0) return { deleted: 0 };
  const cutoff = new Date((opts.now ?? new Date()).getTime() - days * 86_400_000);
  const rows = await db
    .delete(reviewItems)
    .where(
      and(
        orgEq(reviewItems.organizationId, ctx),
        // Descartado → siempre. Revisado → sólo si ya está en la biblioteca (si no, esto es la única copia).
        or(
          eq(reviewItems.status, 'DISCARDED'),
          and(eq(reviewItems.status, 'REVIEWED'), isNotNull(reviewItems.knowledgeItemId)),
        ),
        // `reviewed_at` sólo lo tienen los revisados; para los descartados vale su última modificación.
        // La comparación va entera en SQL con el corte casteado: con `lt()` el driver recibía un Date sin tipo.
        sql`coalesce(${reviewItems.reviewedAt}, ${reviewItems.updatedAt}) < ${cutoff.toISOString()}::timestamptz`,
      ),
    )
    .returning({ id: reviewItems.id, title: reviewItems.title, status: reviewItems.status });
  // Rastro en `audit_logs` como en los otros barridos de retención: el elemento desaparece, el registro de que
  // se borró (y por qué) se conserva.
  for (const r of rows) {
    await recordAudit(db, ctx, {
      action: 'DELETE',
      entityType: 'review_item',
      entityId: r.id,
      metadata: { reason: 'review-retention', title: r.title, status: r.status, retentionDays: days },
    });
  }
  return { deleted: rows.length };
}
