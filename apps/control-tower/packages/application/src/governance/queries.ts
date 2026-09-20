import { and, eq, asc, desc, count, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { strategicAreas, goals, capabilities, services, serviceCapabilities, knowledgeItems } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';
import { notFound } from '../errors';

/** Consultas de lectura del módulo Governance. Todas filtran por organización. */

export function listStrategicAreas(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(strategicAreas)
    .where(and(orgEq(strategicAreas.organizationId, ctx), isNull(strategicAreas.archivedAt)))
    .orderBy(asc(strategicAreas.sortOrder), asc(strategicAreas.name));
}

export function listGoals(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(goals)
    .where(and(orgEq(goals.organizationId, ctx), isNull(goals.archivedAt)))
    .orderBy(desc(goals.createdAt));
}

export function listCapabilities(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(capabilities)
    .where(and(orgEq(capabilities.organizationId, ctx), isNull(capabilities.archivedAt)))
    .orderBy(asc(capabilities.name));
}

export function listServices(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(services)
    .where(and(orgEq(services.organizationId, ctx), isNull(services.archivedAt)))
    .orderBy(asc(services.name));
}

export async function getStrategicArea(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(strategicAreas)
    .where(and(eq(strategicAreas.id, id), orgEq(strategicAreas.organizationId, ctx)));
  if (!row) throw notFound('strategic_area');
  return row;
}

export async function getGoal(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), orgEq(goals.organizationId, ctx)));
  if (!row) throw notFound('goal');
  return row;
}

export async function getCapability(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(capabilities)
    .where(and(eq(capabilities.id, id), orgEq(capabilities.organizationId, ctx)));
  if (!row) throw notFound('capability');
  return row;
}

/** Detalle de un service + sus capabilities vinculadas (N:M). */
export async function getServiceWithCapabilities(db: Database, ctx: OrgContext, id: string) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, id), orgEq(services.organizationId, ctx)));
  if (!service) throw notFound('service');

  const linked = await db
    .select({
      id: capabilities.id,
      name: capabilities.name,
      status: capabilities.status,
      maturity: capabilities.maturity,
    })
    .from(serviceCapabilities)
    .innerJoin(capabilities, eq(capabilities.id, serviceCapabilities.capabilityId))
    .where(eq(serviceCapabilities.serviceId, id))
    .orderBy(asc(capabilities.name));

  return { service, capabilities: linked };
}

/** Contadores para la Business Overview (doc 7 pantalla 2). */
export async function getBusinessOverview(db: Database, ctx: OrgContext) {
  const [[areas], [goalsCount], [caps], [svcs], [procs]] = await Promise.all([
    db.select({ n: count() }).from(strategicAreas).where(orgEq(strategicAreas.organizationId, ctx)),
    db.select({ n: count() }).from(goals).where(orgEq(goals.organizationId, ctx)),
    db.select({ n: count() }).from(capabilities).where(orgEq(capabilities.organizationId, ctx)),
    db.select({ n: count() }).from(services).where(orgEq(services.organizationId, ctx)),
    // Procesos (SOP): son ítems de conocimiento de tipo PROCESS, no una entidad propia (owner 2026-09-02).
    db
      .select({ n: count() })
      .from(knowledgeItems)
      .where(and(orgEq(knowledgeItems.organizationId, ctx), isNull(knowledgeItems.archivedAt), eq(knowledgeItems.knowledgeType, 'PROCESS'))),
  ]);
  return {
    strategicAreas: areas?.n ?? 0,
    goals: goalsCount?.n ?? 0,
    capabilities: caps?.n ?? 0,
    services: svcs?.n ?? 0,
    processes: procs?.n ?? 0,
  };
}
