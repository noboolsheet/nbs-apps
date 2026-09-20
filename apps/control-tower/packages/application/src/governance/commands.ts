import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { strategicAreas, goals, capabilities, services, serviceCapabilities } from '@ct/db/schema';
import {
  slugify,
  assertServiceTransition,
  assertCapabilityTransition,
  type ServiceStatus,
  type CapabilityStatus,
} from '@ct/domain';
import {
  createStrategicAreaSchema,
  createGoalSchema,
  createCapabilitySchema,
  createServiceSchema,
  updateStrategicAreaSchema,
  updateGoalSchema,
  updateCapabilitySchema,
  updateServiceSchema,
} from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';

/**
 * Casos de uso del módulo Governance (doc old_9 §9: acciones, no CRUD crudo). Cada uno:
 * autoriza por rol, valida entrada, aplica reglas de dominio, persiste con scope de organización y audita.
 */

export async function createStrategicArea(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createStrategicAreaSchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(strategicAreas)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'strategic_area', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'strategic_area' });
  }
}

export async function updateStrategicArea(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateStrategicAreaSchema.parse(input);
  const [current] = await db
    .select()
    .from(strategicAreas)
    .where(and(eq(strategicAreas.id, id), orgEq(strategicAreas.organizationId, ctx)));
  if (!current) throw notFound('strategic_area');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(strategicAreas)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(strategicAreas.id, id), orgEq(strategicAreas.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'strategic_area', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'strategic_area', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'strategic_area' });
  }
}

export async function createGoal(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createGoalSchema.parse(input);
  if (data.strategicAreaId) {
    const [area] = await db
      .select({ id: strategicAreas.id })
      .from(strategicAreas)
      .where(and(eq(strategicAreas.id, data.strategicAreaId), orgEq(strategicAreas.organizationId, ctx)));
    if (!area) throw notFound('strategic_area');
  }
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(goals)
        .values({
          organizationId: ctx.organizationId,
          name: data.name,
          description: data.description,
          strategicAreaId: data.strategicAreaId,
          parentGoalId: data.parentGoalId,
          status: data.status,
          priority: data.priority,
          targetDate: data.targetDate,
        })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'goal', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'goal' });
  }
}

export async function updateGoal(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateGoalSchema.parse(input);
  const [current] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), orgEq(goals.organizationId, ctx)));
  if (!current) throw notFound('goal');
  if (data.strategicAreaId) {
    const [area] = await db
      .select({ id: strategicAreas.id })
      .from(strategicAreas)
      .where(and(eq(strategicAreas.id, data.strategicAreaId), orgEq(strategicAreas.organizationId, ctx)));
    if (!area) throw notFound('strategic_area');
  }
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(goals)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(goals.id, id), orgEq(goals.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'goal', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'goal', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'goal' });
  }
}

export async function createCapability(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createCapabilitySchema.parse(input);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(capabilities)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'capability', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'capability' });
  }
}

export async function updateCapabilityStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: CapabilityStatus,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(capabilities)
    .where(and(eq(capabilities.id, id), orgEq(capabilities.organizationId, ctx)));
  if (!current) throw notFound('capability');
  assertCapabilityTransition(current.status as CapabilityStatus, status);
  // C-1: los cambios de estado dejan rastro (audit + change_event); antes no registraban nada.
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(capabilities)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(capabilities.id, id), orgEq(capabilities.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'capability',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'capability', entityId: id, metadata: { status } });
    return row!;
  });
}

export async function updateCapability(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateCapabilitySchema.parse(input);
  const [current] = await db
    .select()
    .from(capabilities)
    .where(and(eq(capabilities.id, id), orgEq(capabilities.organizationId, ctx)));
  if (!current) throw notFound('capability');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(capabilities)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(capabilities.id, id), orgEq(capabilities.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'capability', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'capability', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'capability' });
  }
}

export async function createService(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createServiceSchema.parse(input);
  const slug = data.slug ?? slugify(data.name);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(services)
        .values({
          organizationId: ctx.organizationId,
          name: data.name,
          slug,
          description: data.description,
          status: data.status,
          serviceType: data.serviceType,
          notes: data.notes,
        })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'service', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'service' });
  }
}

/** Edición de metadatos del servicio (el estado va por `updateServiceStatus`). */
export async function updateService(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateServiceSchema.parse(input);
  const [current] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), orgEq(services.organizationId, ctx)));
  if (!current) throw notFound('service');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(services)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(services.id, id), orgEq(services.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo de la edición (además del audit de "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'service', entityId: id, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'service', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'service' });
  }
}

export async function updateServiceStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: ServiceStatus,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), orgEq(services.organizationId, ctx)));
  if (!current) throw notFound('service');
  assertServiceTransition(current.status as ServiceStatus, status);
  // C-1: los cambios de estado dejan rastro (audit + change_event); antes no registraban nada.
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(services)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(services.id, id), orgEq(services.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'service',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'service', entityId: id, metadata: { status } });
    return row!;
  });
}

/** Vincula una capability a un service (N:M). Ambos deben pertenecer a la organización. */
export async function linkServiceCapability(
  db: Database,
  ctx: OrgContext,
  serviceId: string,
  capabilityId: string,
) {
  requireCan(ctx.role, 'write');
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), orgEq(services.organizationId, ctx)));
  if (!svc) throw notFound('service');
  const [cap] = await db
    .select({ id: capabilities.id })
    .from(capabilities)
    .where(and(eq(capabilities.id, capabilityId), orgEq(capabilities.organizationId, ctx)));
  if (!cap) throw notFound('capability');
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(serviceCapabilities)
        .values({ serviceId, capabilityId })
        .onConflictDoNothing();
      // C-1: vincular/desvincular capacidades es un cambio de gobierno; queda en el audit.
      await recordAudit(tx, ctx, {
        action: 'UPDATE',
        entityType: 'service',
        entityId: serviceId,
        metadata: { linkedCapability: capabilityId },
      });
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'service_capability' });
  }
}

/**
 * Crea una capacidad NUEVA y la vincula al servicio en una sola operación (transacción).
 * Para el patrón "＋ Nueva capacidad" desde la ficha de servicio. La capacidad es N:N: se crea global
 * y se enlaza; después puede vincularse a más servicios. Devuelve la capacidad creada.
 */
export async function createServiceCapability(
  db: Database,
  ctx: OrgContext,
  serviceId: string,
  input: unknown,
) {
  requireCan(ctx.role, 'write');
  const data = createCapabilitySchema.parse(input);
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), orgEq(services.organizationId, ctx)));
  if (!svc) throw notFound('service');
  try {
    // Atómico: la capacidad y su vínculo se crean juntos (mismo patrón que otros comandos con tx).
    return await db.transaction(async (tx) => {
      const [cap] = await tx
        .insert(capabilities)
        .values({ organizationId: ctx.organizationId, ...data })
        .returning();
      await tx
        .insert(serviceCapabilities)
        .values({ serviceId, capabilityId: cap!.id })
        .onConflictDoNothing();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'capability', entityId: cap!.id });
      return cap!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'capability' });
  }
}

export async function unlinkServiceCapability(
  db: Database,
  ctx: OrgContext,
  serviceId: string,
  capabilityId: string,
) {
  requireCan(ctx.role, 'write');
  // El scope de organización se garantiza validando que el service es de la org.
  const [svc] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), orgEq(services.organizationId, ctx)));
  if (!svc) throw notFound('service');
  await db.transaction(async (tx) => {
    await tx
      .delete(serviceCapabilities)
      .where(
        and(
          eq(serviceCapabilities.serviceId, serviceId),
          eq(serviceCapabilities.capabilityId, capabilityId),
        ),
      );
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'service',
      entityId: serviceId,
      metadata: { unlinkedCapability: capabilityId },
    });
  });
}
