import { and, eq, desc, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { resources, projects, clients } from '@ct/db/schema';
import { createResourceSchema, updateResourceSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';

/**
 * Activos por cliente/proyecto (Fase 8 / E-5). SÓLO referencias, NUNCA secretos. Relación: un activo cuelga de
 * un proyecto (y su cliente se **denormaliza** del proyecto) o directamente de un cliente. Así el rollup por
 * cliente (`client_id = X`) incluye los de sus proyectos, y por proyecto (`project_id = Y`) es directo.
 */

async function resolveClientFromProject(db: Database, ctx: OrgContext, projectId: string): Promise<string | null> {
  const [proj] = await db
    .select({ clientId: projects.clientId })
    .from(projects)
    .where(and(eq(projects.id, projectId), orgEq(projects.organizationId, ctx)));
  if (!proj) throw notFound('project');
  return proj.clientId;
}

async function assertClientInOrg(db: Database, ctx: OrgContext, clientId: string) {
  const [cl] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), orgEq(clients.organizationId, ctx)));
  if (!cl) throw notFound('client');
}

export async function createResource(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createResourceSchema.parse(input);
  let clientId = data.clientId ?? null;
  if (data.projectId) {
    clientId = (await resolveClientFromProject(db, ctx, data.projectId)) ?? clientId; // denormaliza
  } else if (clientId) {
    await assertClientInOrg(db, ctx, clientId);
  }
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(resources)
        .values({
          organizationId: ctx.organizationId,
          clientId,
          projectId: data.projectId,
          name: data.name,
          type: data.type,
          status: data.status,
          hosting: data.hosting,
          url: data.url,
          provider: data.provider,
          environment: data.environment,
          credentialLocation: data.credentialLocation,
          notes: data.notes,
        })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'resource', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'resource' });
  }
}

export async function getResource(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), orgEq(resources.organizationId, ctx)));
  if (!row) throw notFound('resource');
  return row;
}

export async function updateResource(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateResourceSchema.parse(input);
  const [current] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), orgEq(resources.organizationId, ctx)));
  if (!current) throw notFound('resource');

  const patch: Record<string, unknown> = { ...data, updatedAt: new Date() };
  // Si cambia el proyecto, re-denormaliza el cliente desde el proyecto.
  if ('projectId' in data) {
    patch.clientId = data.projectId ? await resolveClientFromProject(db, ctx, data.projectId) : (data.clientId ?? null);
  } else if (data.clientId) {
    await assertClientInOrg(db, ctx, data.clientId);
  }
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(resources)
        .set(patch)
        .where(and(eq(resources.id, id), orgEq(resources.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo (incluye el clientId re-denormalizado si cambió el proyecto).
      await recordFieldChanges(tx, ctx, { entityType: 'resource', entityId: id, before: current, changed: patch });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'resource', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'resource' });
  }
}

export async function deleteResource(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'delete');
  const [row] = await db
    .delete(resources)
    .where(and(eq(resources.id, id), orgEq(resources.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('resource');
  await recordAudit(db, ctx, { action: 'DELETE', entityType: 'resource', entityId: id });
}

export function listResourcesByClient(db: Database, ctx: OrgContext, clientId: string) {
  return db
    .select()
    .from(resources)
    .where(and(orgEq(resources.organizationId, ctx), isNull(resources.archivedAt), eq(resources.clientId, clientId)))
    .orderBy(desc(resources.createdAt));
}

export function listResourcesByProject(db: Database, ctx: OrgContext, projectId: string) {
  return db
    .select()
    .from(resources)
    .where(and(orgEq(resources.organizationId, ctx), isNull(resources.archivedAt), eq(resources.projectId, projectId)))
    .orderBy(desc(resources.createdAt));
}

/** Todos los activos con nombre de cliente/proyecto (para el espejo a Notion; campos escalares). */
export function listResources(db: Database, ctx: OrgContext) {
  return db
    .select({
      id: resources.id,
      name: resources.name,
      type: resources.type,
      status: resources.status,
      hosting: resources.hosting,
      url: resources.url,
      provider: resources.provider,
      environment: resources.environment,
      credentialLocation: resources.credentialLocation,
      notes: resources.notes,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(resources)
    .leftJoin(clients, eq(clients.id, resources.clientId))
    .leftJoin(projects, eq(projects.id, resources.projectId))
    .where(and(orgEq(resources.organizationId, ctx), isNull(resources.archivedAt)))
    .orderBy(desc(resources.createdAt));
}
