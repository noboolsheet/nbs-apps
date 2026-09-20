import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { opportunities, projects } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';
import { createProject } from '../projects/commands';

export * from './catalog';
export * from './state';
export * from './run';

/**
 * Automatizaciones por evento (Fase 6, 2ª parte). ERRATA-009: NO hay constructor visual; son handlers de código
 * disparados por el Outbox transaccional. Cada handler debe ser **idempotente** (el Outbox puede reintentar).
 */

/**
 * Oportunidad GANADA → crear su Proyecto. Disparado por el evento `opportunity.won` (emitido atómicamente al mover
 * el stage a WON). Idempotente: si ya existe un proyecto de esa oportunidad, no crea otro. El proyecto hereda el
 * cliente de la oportunidad (y con él el tipo CLIENT) y queda enlazado por `opportunityId`.
 *
 * Devuelve el id del proyecto (creado o preexistente), o null si la oportunidad no existe / no está ganada.
 */
export async function createProjectFromWonOpportunity(
  db: Database,
  ctx: OrgContext,
  opportunityId: string,
): Promise<string | null> {
  const [opp] = await db
    .select({ name: opportunities.name, clientId: opportunities.clientId, status: opportunities.status })
    .from(opportunities)
    .where(and(eq(opportunities.id, opportunityId), orgEq(opportunities.organizationId, ctx)));
  if (!opp || opp.status !== 'WON') return null;

  // Idempotencia: ¿ya hay un proyecto de esta oportunidad?
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.opportunityId, opportunityId), orgEq(projects.organizationId, ctx)));
  if (existing) return existing.id;

  const project = await createProject(db, ctx, {
    name: opp.name,
    clientId: opp.clientId ?? undefined,
    opportunityId,
    // A-1 (ADR-005): si la oportunidad trae cliente, el proyecto nace de tipo CLIENT; si no, INTERNAL
    // (el invariante "CLIENT exige cliente" rechazaría lo contrario).
    type: opp.clientId ? 'CLIENT' : 'INTERNAL',
  });
  return project.id;
}
