import { and, eq, desc, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { learningItems } from '@ct/db/schema';
import { createLearningItemSchema, updateLearningItemSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { rowCap } from '../list-limit';

/**
 * Learning Path — tracking de aprendizaje (cursos, habilidades, temas, roadmaps). CT-nativo, distinto de capabilities.
 * Sólo referencias (link al recurso online). Se espeja a Notion (push-only) como los activos.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function creatorId(ctx: OrgContext): string | null {
  return UUID_RE.test(ctx.userId) ? ctx.userId : null;
}

export async function createLearningItem(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createLearningItemSchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(learningItems)
        .values({ organizationId: ctx.organizationId, createdByUserId: creatorId(ctx), ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'learning_item', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'learning_item' });
  }
}

export async function getLearningItem(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(learningItems)
    .where(and(eq(learningItems.id, id), orgEq(learningItems.organizationId, ctx)));
  if (!row) throw notFound('learning_item');
  return row;
}

export async function updateLearningItem(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateLearningItemSchema.parse(input);
  const [current] = await db
    .select()
    .from(learningItems)
    .where(and(eq(learningItems.id, id), orgEq(learningItems.organizationId, ctx)));
  if (!current) throw notFound('learning_item');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(learningItems)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(learningItems.id, id), orgEq(learningItems.organizationId, ctx)))
        .returning();
      if (!row) throw notFound('learning_item');
      // F-4: diff campo a campo.
      await recordFieldChanges(tx, ctx, { entityType: 'learning_item', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'learning_item', entityId: id });
      return row;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'learning_item' });
  }
}

export async function deleteLearningItem(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'delete');
  const [row] = await db
    .delete(learningItems)
    .where(and(eq(learningItems.id, id), orgEq(learningItems.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('learning_item');
  await recordAudit(db, ctx, { action: 'DELETE', entityType: 'learning_item', entityId: id });
}

/** Todos los items de learning (para la lista y el espejo a Notion; campos escalares). */
export function listLearningItems(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select({
      id: learningItems.id,
      title: learningItems.title,
      kind: learningItems.kind,
      status: learningItems.status,
      sector: learningItems.sector,
      url: learningItems.url,
      progress: learningItems.progress,
      notes: learningItems.notes,
      updatedAt: learningItems.updatedAt,
    })
    .from(learningItems)
    .where(and(orgEq(learningItems.organizationId, ctx), isNull(learningItems.archivedAt)))
    .orderBy(desc(learningItems.updatedAt))
    .limit(rowCap(limit));
}
