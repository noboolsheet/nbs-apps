import { and, eq, asc, desc, isNull, isNotNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { clients, contacts, opportunities } from '@ct/db/schema';
import { isOpportunityStageClosed, type OpportunityStage } from '@ct/domain';
import { orgEq, type OrgContext } from '../auth/index';
import { notFound } from '../errors';
import { rowCap } from '../list-limit';

/** Consultas del módulo CRM. Todas filtran por organización. */

/** Lista clientes de la org, opcionalmente filtrando por `status` (ACTIVE/INACTIVE). Sin filtro = todos. */
export function listClients(db: Database, ctx: OrgContext, status?: string, limit?: number) {
  return db
    .select()
    .from(clients)
    .where(and(orgEq(clients.organizationId, ctx), isNull(clients.archivedAt), status ? eq(clients.status, status) : undefined))
    .orderBy(asc(clients.name))
    .limit(rowCap(limit));
}

export function listContacts(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select()
    .from(contacts)
    .where(and(orgEq(contacts.organizationId, ctx), isNull(contacts.archivedAt)))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName))
    .limit(rowCap(limit));
}

/** Oportunidades ACTIVAS (no archivadas) → vista Kanban. */
export function listOpportunities(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(opportunities)
    .where(and(orgEq(opportunities.organizationId, ctx), isNull(opportunities.archivedAt)))
    .orderBy(desc(opportunities.createdAt));
}

/** Oportunidades ARCHIVADAS (cerradas y retiradas del tablero) → vista de lista. Más recientes primero. */
export function listArchivedOpportunities(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(opportunities)
    .where(and(orgEq(opportunities.organizationId, ctx), isNotNull(opportunities.archivedAt)))
    .orderBy(desc(opportunities.archivedAt));
}

export async function getContact(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), orgEq(contacts.organizationId, ctx)));
  if (!row) throw notFound('contact');
  return row;
}

/** Estado de congelado de una oportunidad para la UI: archivada y/o cerrada (columna "Cerradas"). */
export async function getOpportunityFreeze(db: Database, ctx: OrgContext, id: string): Promise<{ archived: boolean; closed: boolean }> {
  const [row] = await db
    .select({ archivedAt: opportunities.archivedAt, stage: opportunities.stage })
    .from(opportunities)
    .where(and(eq(opportunities.id, id), orgEq(opportunities.organizationId, ctx)));
  return { archived: !!row?.archivedAt, closed: row ? isOpportunityStageClosed(row.stage as OpportunityStage) : false };
}

export async function getOpportunity(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(opportunities)
    .where(and(eq(opportunities.id, id), orgEq(opportunities.organizationId, ctx)));
  if (!row) throw notFound('opportunity');
  return row;
}

/** Detalle de un client con sus contactos y oportunidades relacionadas (tabs del wireframe). */
export async function getClientDetail(db: Database, ctx: OrgContext, id: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), orgEq(clients.organizationId, ctx)));
  if (!client) throw notFound('client');

  const [clientContacts, clientOpportunities] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(and(eq(contacts.clientId, id), orgEq(contacts.organizationId, ctx), isNull(contacts.archivedAt)))
      .orderBy(asc(contacts.lastName)),
    db
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.clientId, id), orgEq(opportunities.organizationId, ctx), isNull(opportunities.archivedAt)))
      .orderBy(desc(opportunities.createdAt)),
  ]);

  return { client, contacts: clientContacts, opportunities: clientOpportunities };
}
