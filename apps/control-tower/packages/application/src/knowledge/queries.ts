import { and, eq, asc, desc, isNull, isNotNull, type SQL } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { knowledgeInbox, knowledgeItems, learningItems, decisions, documents, assets, reviewItems } from '@ct/db/schema';
import { SECTOR_SUGGESTIONS } from '@ct/domain';
import { orgEq, scopedWhere, type OrgContext } from '../auth/index';
import { notFound } from '../errors';
import { rowCap } from '../list-limit';

/** Consultas del módulo Knowledge. Todas filtran por organización. */

export function listInbox(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(knowledgeInbox)
    .where(orgEq(knowledgeInbox.organizationId, ctx))
    .orderBy(desc(knowledgeInbox.capturedAt));
}

/**
 * Sectores sugeridos para los desplegables: la base fija (`SECTOR_SUGGESTIONS`) UNIDA a los sectores ya usados
 * por la org (biblioteca, aprendizajes, capturas y cola de «Por revisar»). Así, al escribir uno nuevo (p. ej. "Seguridad
 * Informática"), la próxima vez aparece entre las sugerencias. Etiqueta libre → deduplicado y ordenado (es).
 */
export async function listSectors(db: Database, ctx: OrgContext): Promise<string[]> {
  const [ki, li, inbox, review] = await Promise.all([
    db
      .selectDistinct({ sector: knowledgeItems.sector })
      .from(knowledgeItems)
      .where(and(orgEq(knowledgeItems.organizationId, ctx), isNotNull(knowledgeItems.sector))),
    db
      .selectDistinct({ sector: learningItems.sector })
      .from(learningItems)
      .where(and(orgEq(learningItems.organizationId, ctx), isNotNull(learningItems.sector))),
    db
      .selectDistinct({ sector: knowledgeInbox.sector })
      .from(knowledgeInbox)
      .where(and(orgEq(knowledgeInbox.organizationId, ctx), isNotNull(knowledgeInbox.sector))),
    db
      .selectDistinct({ sector: reviewItems.sector })
      .from(reviewItems)
      .where(and(orgEq(reviewItems.organizationId, ctx), isNotNull(reviewItems.sector))),
  ]);
  const used = [...ki, ...li, ...inbox, ...review]
    .map((r) => r.sector)
    .filter((s): s is string => !!s && s.trim().length > 0);
  return Array.from(new Set([...SECTOR_SUGGESTIONS, ...used])).sort((a, b) => a.localeCompare(b, 'es'));
}

export async function getInboxItem(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(knowledgeInbox)
    .where(and(eq(knowledgeInbox.id, id), orgEq(knowledgeInbox.organizationId, ctx)));
  if (!row) throw notFound('knowledge_inbox');
  return row;
}

/**
 * Biblioteca de conocimiento. `filter.knowledgeType` acota a un tipo del enum — lo usa la vista **Negocio ›
 * Procesos (SOP)**, que es la Biblioteca filtrada a `PROCESS` (owner 2026-09-02: los SOP no son una entidad
 * aparte, son ítems de conocimiento de tipo proceso).
 */
export function listKnowledgeItems(
  db: Database,
  ctx: OrgContext,
  filter?: { knowledgeType?: string },
  limit?: number,
) {
  const extra = [orgEq(knowledgeItems.organizationId, ctx), isNull(knowledgeItems.archivedAt)];
  if (filter?.knowledgeType) extra.push(eq(knowledgeItems.knowledgeType, filter.knowledgeType));
  return db
    .select()
    .from(knowledgeItems)
    .where(and(...extra))
    .orderBy(desc(knowledgeItems.updatedAt))
    .limit(rowCap(limit));
}

export function listDecisions(db: Database, ctx: OrgContext, filter?: { projectId?: string }, limit?: number) {
  const extra = [orgEq(decisions.organizationId, ctx), isNull(decisions.archivedAt)];
  if (filter?.projectId) extra.push(eq(decisions.projectId, filter.projectId));
  return db
    .select()
    .from(decisions)
    .where(and(...extra))
    .orderBy(desc(decisions.createdAt))
    .limit(rowCap(limit));
}

export async function getDecision(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)));
  if (!row) throw notFound('decision');
  return row;
}

/**
 * A-2 (ADR-006) — cadena de reemplazo de una decisión: a cuál reemplaza ("supersedes") y cuál la reemplazó a ella
 * ("superseded by", el inverso, que se resuelve por query en vez de duplicar columna).
 */
export async function getDecisionLinks(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select({ supersedesDecisionId: decisions.supersedesDecisionId })
    .from(decisions)
    .where(and(eq(decisions.id, id), orgEq(decisions.organizationId, ctx)));
  if (!row) throw notFound('decision');
  const [supersedes, supersededBy] = await Promise.all([
    row.supersedesDecisionId
      ? db
          .select({ id: decisions.id, title: decisions.title, status: decisions.status })
          .from(decisions)
          .where(and(eq(decisions.id, row.supersedesDecisionId), orgEq(decisions.organizationId, ctx)))
      : Promise.resolve([]),
    db
      .select({ id: decisions.id, title: decisions.title, status: decisions.status })
      .from(decisions)
      .where(and(eq(decisions.supersedesDecisionId, id), orgEq(decisions.organizationId, ctx))),
  ]);
  return { supersedes: supersedes[0] ?? null, supersededBy: supersededBy[0] ?? null };
}

export function listAssets(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select()
    .from(assets)
    .where(and(orgEq(assets.organizationId, ctx), isNull(assets.archivedAt)))
    .orderBy(asc(assets.name))
    .limit(rowCap(limit));
}

export async function getKnowledgeItem(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(knowledgeItems)
    .where(and(eq(knowledgeItems.id, id), orgEq(knowledgeItems.organizationId, ctx)));
  if (!row) throw notFound('knowledge_item');
  return row;
}

export async function getAsset(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, id), orgEq(assets.organizationId, ctx)));
  if (!row) throw notFound('asset');
  return row;
}

/** Documentos, opcionalmente filtrados por proyecto o cliente (para las tabs Documents). */
export async function getDocument(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), orgEq(documents.organizationId, ctx)));
  if (!row) throw notFound('document');
  return row;
}

export function listDocuments(
  db: Database,
  ctx: OrgContext,
  filter?: { projectId?: string; clientId?: string },
  limit?: number,
) {
  const extra: (SQL | undefined)[] = [];
  if (filter?.projectId) extra.push(eq(documents.projectId, filter.projectId));
  if (filter?.clientId) extra.push(eq(documents.clientId, filter.clientId));
  extra.push(isNull(documents.archivedAt));
  return db
    .select()
    .from(documents)
    .where(scopedWhere(documents.organizationId, ctx, ...extra))
    .orderBy(desc(documents.createdAt))
    .limit(rowCap(limit));
}
