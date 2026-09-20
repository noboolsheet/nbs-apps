import { and, eq, asc, desc, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { portfolioItems, projects, assets } from '@ct/db/schema';
import { assertPortfolioItemTransition, type PortfolioItemStatus } from '@ct/domain';
import {
  createPortfolioItemSchema,
  updatePortfolioItemSchema,
  updatePortfolioItemVisibilitySchema,
} from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { rowCap } from '../list-limit';

/** Módulo Portfolio (ADR-001). Catálogo/gobierno simple; project/asset opcionales. */

async function assertRefInOrg(
  db: Database,
  ctx: OrgContext,
  table: typeof projects | typeof assets,
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

export async function createPortfolioItem(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createPortfolioItemSchema.parse(input);
  await assertRefInOrg(db, ctx, projects, data.projectId, 'project');
  await assertRefInOrg(db, ctx, assets, data.assetId, 'asset');
  try {
    // C-1: portfolio no registraba NADA en la auditoría; ahora create/update/status/visibilidad sí.
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(portfolioItems)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'portfolio_item', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'portfolio_item' });
  }
}

async function loadItem(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(portfolioItems)
    .where(and(eq(portfolioItems.id, id), orgEq(portfolioItems.organizationId, ctx)));
  if (!row) throw notFound('portfolio_item');
  return row;
}

export async function updatePortfolioItemStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: PortfolioItemStatus,
) {
  requireCan(ctx.role, 'write');
  const current = await loadItem(db, ctx, id);
  assertPortfolioItemTransition(current.status as PortfolioItemStatus, status);
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(portfolioItems)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(portfolioItems.id, id), orgEq(portfolioItems.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'portfolio_item',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'portfolio_item', entityId: id, metadata: { status } });
    return row!;
  });
}

/** Edición de metadatos del item (estado y visibilidad tienen sus propios comandos). */
export async function updatePortfolioItem(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updatePortfolioItemSchema.parse(input);
  const current = await loadItem(db, ctx, id);
  await assertRefInOrg(db, ctx, projects, data.projectId ?? undefined, 'project');
  await assertRefInOrg(db, ctx, assets, data.assetId ?? undefined, 'asset');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(portfolioItems)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(portfolioItems.id, id), orgEq(portfolioItems.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo.
      await recordFieldChanges(tx, ctx, { entityType: 'portfolio_item', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'portfolio_item', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'portfolio_item' });
  }
}

export async function updatePortfolioItemVisibility(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const { visibility } = updatePortfolioItemVisibilitySchema.parse(input);
  const current = await loadItem(db, ctx, id);
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(portfolioItems)
      .set({ visibility, updatedAt: new Date() })
      .where(and(eq(portfolioItems.id, id), orgEq(portfolioItems.organizationId, ctx)))
      .returning();
    await recordFieldChanges(tx, ctx, {
      entityType: 'portfolio_item',
      entityId: id,
      before: current,
      changed: { visibility },
    });
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'portfolio_item',
      entityId: id,
      metadata: { visibility },
    });
    return row!;
  });
}

export function listPortfolioItems(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select()
    .from(portfolioItems)
    .where(and(orgEq(portfolioItems.organizationId, ctx), isNull(portfolioItems.archivedAt)))
    .orderBy(desc(portfolioItems.createdAt), asc(portfolioItems.name))
    .limit(rowCap(limit));
}

export async function getPortfolioItem(db: Database, ctx: OrgContext, id: string) {
  return loadItem(db, ctx, id);
}
