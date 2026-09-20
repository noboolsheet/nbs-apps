import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { clients, contacts, opportunities, tasks } from '@ct/db/schema';
import { companyPatch, personPatch, opportunityPatch, taskPatch, type TwentyDataSource } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { getExternalIdentityFor } from './identity';

/**
 * Write-back CT → Twenty (E-1, Fase 5). CT empuja SOLO los campos que gestiona (PATCH parcial), sobre registros
 * que YA vinieron de Twenty (resueltos por `external_identities`); los creados en CT no se envían (alcance:
 * "solo actualizar existentes"). Se dispara desde el Outbox (`twenty.push`) al editar por un USER; el sync es
 * SYSTEM y no re-empuja, así que no hay bucles.
 */

const P = 'TWENTY';

/** entityType interno → (external_type de identidad, recurso REST de Twenty). */
const TARGETS: Record<string, { externalType: string; resource: string }> = {
  client: { externalType: 'company', resource: 'companies' },
  contact: { externalType: 'person', resource: 'people' },
  opportunity: { externalType: 'opportunity', resource: 'opportunities' },
  task: { externalType: 'task', resource: 'tasks' },
};

async function buildBody(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'client') {
    const [r] = await db
      .select({ name: clients.name, websiteUrl: clients.websiteUrl, industry: clients.industry })
      .from(clients)
      .where(and(eq(clients.id, entityId), orgEq(clients.organizationId, ctx)));
    return r ? companyPatch(r) : null;
  }
  if (entityType === 'contact') {
    const [r] = await db
      .select({ firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, phone: contacts.phone, jobTitle: contacts.jobTitle })
      .from(contacts)
      .where(and(eq(contacts.id, entityId), orgEq(contacts.organizationId, ctx)));
    return r ? personPatch(r) : null;
  }
  if (entityType === 'opportunity') {
    // CT sólo posee el `stage` (owner 2026-09-02: es la máquina de estados de la oportunidad). Nombre, importe y
    // fecha se editan en Twenty; empujarlos desde aquí machacaría el original con una copia potencialmente vieja.
    const [r] = await db
      .select({ stage: opportunities.stage })
      .from(opportunities)
      .where(and(eq(opportunities.id, entityId), orgEq(opportunities.organizationId, ctx)));
    return r ? opportunityPatch({ stage: r.stage }) : null;
  }
  if (entityType === 'task') {
    // CT es dueño de la FECHA de una task de Twenty (reprogramar) → se empuja `dueDate`. El título lo posee Twenty.
    const [r] = await db
      .select({ dueDate: tasks.dueDate })
      .from(tasks)
      .where(and(eq(tasks.id, entityId), orgEq(tasks.organizationId, ctx)));
    return r ? taskPatch({ dueDate: r.dueDate }) : null;
  }
  return null;
}

/** Empuja una entidad CT a su registro de Twenty. No-op ('skip') si no tiene identidad Twenty o no hay campos. */
export async function runTwentyEntityPush(
  db: Database,
  ctx: OrgContext,
  ds: TwentyDataSource,
  entityType: string,
  entityId: string,
): Promise<'updated' | 'skip'> {
  const target = TARGETS[entityType];
  if (!target) return 'skip';
  const identity = await getExternalIdentityFor(db, ctx, P, entityType, entityId);
  if (!identity) return 'skip'; // creado en CT, no vino de Twenty → no se crea allá (alcance v1)
  const body = await buildBody(db, ctx, entityType, entityId);
  if (!body || Object.keys(body).length === 0) return 'skip';
  await ds.update(target.resource, identity.externalId, body);
  return 'updated';
}
