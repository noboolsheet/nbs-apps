import { and, eq, lt, inArray, isNull, isNotNull, desc } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { z } from '@ct/validation';
import type { Database } from '@ct/db';
import {
  clients,
  contacts,
  opportunities,
  strategicAreas,
  goals,
  capabilities,
  services,
  decisions,
  knowledgeItems,
  documents,
  assets,
  portfolioItems,
  learningItems,
  projects,
  tasks,
  deliverables,
  resources,
  payments,
  reviewItems,
  projectPhases,
  projectAssets,
  serviceCapabilities,
  externalIdentities,
  outboxEvents,
} from '@ct/db/schema';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { logger } from '@ct/shared';

/**
 * Archivado en lote (soft-delete reversible) vía `archivedAt`. `ARCHIVABLE` (entityType→tabla + columna de nombre +
 * etiqueta) es también la allowlist de seguridad: solo se puede archivar/restaurar/listar lo que esté aquí. Las claves
 * = entityType de auditoría. Requiere rol `delete` (ADMIN+). `nameCol` = columna a mostrar en la vista "Archivados".
 */
interface ArchivableMeta {
  table: PgTable;
  nameCol: AnyPgColumn;
  label: string;
}
export const ARCHIVABLE: Record<string, ArchivableMeta> = {
  task: { table: tasks, nameCol: tasks.title, label: 'Tareas' },
  project: { table: projects, nameCol: projects.name, label: 'Proyectos' },
  deliverable: { table: deliverables, nameCol: deliverables.name, label: 'Entregables' },
  resource: { table: resources, nameCol: resources.name, label: 'Recursos' },
  client: { table: clients, nameCol: clients.name, label: 'Clientes' },
  contact: { table: contacts, nameCol: contacts.email, label: 'Contactos' },
  opportunity: { table: opportunities, nameCol: opportunities.name, label: 'Oportunidades' },
  strategic_area: { table: strategicAreas, nameCol: strategicAreas.name, label: 'Áreas estratégicas' },
  goal: { table: goals, nameCol: goals.name, label: 'Objetivos' },
  capability: { table: capabilities, nameCol: capabilities.name, label: 'Capacidades' },
  service: { table: services, nameCol: services.name, label: 'Servicios' },
  decision: { table: decisions, nameCol: decisions.title, label: 'Decisiones' },
  knowledge_item: { table: knowledgeItems, nameCol: knowledgeItems.title, label: 'Conocimiento' },
  document: { table: documents, nameCol: documents.name, label: 'Documentos' },
  asset: { table: assets, nameCol: assets.name, label: 'Reutilizables' },
  portfolio_item: { table: portfolioItems, nameCol: portfolioItems.name, label: 'Portafolio' },
  learning_item: { table: learningItems, nameCol: learningItems.title, label: 'Aprendizaje' },
  payment: { table: payments, nameCol: payments.concept, label: 'Pagos' },
  review_item: { table: reviewItems, nameCol: reviewItems.title, label: 'Por revisar' },
};

/** Columnas comunes a toda tabla archivable (todas llevan id/organization_id/archived_at). */
type ArchivableCols = { id: AnyPgColumn; organizationId: AnyPgColumn; archivedAt: AnyPgColumn };

const idsSchema = z.object({
  entityType: z.string(),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/** Aplica `archivedAt = value` a las filas seleccionadas (value=Date → archiva; null → restaura). */
async function setArchived(
  db: Database,
  ctx: OrgContext,
  input: unknown,
  value: Date | null,
): Promise<number> {
  requireCan(ctx.role, 'delete');
  const { entityType, ids } = idsSchema.parse(input);
  const meta = ARCHIVABLE[entityType];
  if (!meta) throw notFound('entity');
  const c = meta.table as unknown as ArchivableCols;
  const onlyMatching = value === null ? isNotNull(c.archivedAt) : isNull(c.archivedAt);
  try {
    const rows = await db
      .update(meta.table)
      .set({ archivedAt: value })
      .where(and(inArray(c.id, ids), orgEq(c.organizationId, ctx), onlyMatching))
      .returning({ id: c.id });
    for (const r of rows) {
      await recordAudit(db, ctx, { action: value === null ? 'RESTORE' : 'ARCHIVE', entityType, entityId: String(r.id) });
    }
    return rows.length;
  } catch (e) {
    throw mapDbError(e, { entity: entityType });
  }
}

export function archiveRecords(db: Database, ctx: OrgContext, input: unknown): Promise<number> {
  return setArchived(db, ctx, input, new Date());
}

export function restoreRecords(db: Database, ctx: OrgContext, input: unknown): Promise<number> {
  return setArchived(db, ctx, input, null);
}

export interface ArchivedGroup {
  entityType: string;
  label: string;
  items: { id: string; name: string | null; archivedAt: Date | null }[];
}

/**
 * Orden de purga HIJO→PADRE: se borra primero lo que referencia a otras entidades y al final los "padres".
 * NO es cosmético: una fila aún referenciada por una FK **no se puede borrar**, así que un orden mal puesto deja
 * registros archivados que no se purgan NUNCA (se saltaban en silencio en cada barrido). El orden sale de las FKs
 * reales (`information_schema`), y `purgeOrderCoversArchivable()` verifica que no falte ninguna entidad.
 */
const PURGE_ORDER: readonly string[] = [
  // 1) hojas: sólo apuntan hacia arriba
  'task', // → project, opportunity, task(self)
  'deliverable', // → project
  'decision', // → project, service, decision(self)
  'resource', // → client, project
  'portfolio_item', // → project, asset
  'document', // → project, client
  'review_item', // → knowledge_item
  'payment', // → client, contact
  // 2) intermedias
  'project', // → client, contact, opportunity, service
  'opportunity', // → client, contact
  'contact', // → client
  'goal', // → strategic_area, goal(self)
  'knowledge_item',
  'asset',
  'learning_item',
  'capability',
  'service',
  // 3) padres
  'client',
  'strategic_area',
];

/** Entidades de `ARCHIVABLE` que faltan en `PURGE_ORDER` (⇒ nunca se purgarían). Lo usa el test de regresión. */
export function purgeOrderMissingEntities(): string[] {
  return Object.keys(ARCHIVABLE).filter((k) => !PURGE_ORDER.includes(k));
}

/**
 * Filas HIJAS que NO son entidades propias (no se archivan ni salen en «Archivados») pero tienen una FK al
 * registro que vamos a borrar: fases y activos enlazados de un proyecto, enlaces servicio↔capacidad. Si no se
 * borran con su padre, la FK bloquea el borrado para siempre. `projects.current_phase_id` apunta a una fase, así
 * que hay que soltarlo ANTES de borrar las fases.
 */
async function deleteDependents(db: Database, ctx: OrgContext, entityType: string, id: string): Promise<void> {
  switch (entityType) {
    case 'project':
      await db
        .update(projects)
        .set({ currentPhaseId: null })
        .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)));
      await db.delete(projectPhases).where(eq(projectPhases.projectId, id));
      await db.delete(projectAssets).where(eq(projectAssets.projectId, id));
      break;
    case 'asset':
      await db.delete(projectAssets).where(eq(projectAssets.assetId, id));
      break;
    case 'service':
      await db.delete(serviceCapabilities).where(eq(serviceCapabilities.serviceId, id));
      break;
    case 'capability':
      await db.delete(serviceCapabilities).where(eq(serviceCapabilities.capabilityId, id));
      break;
    default:
      break;
  }
}

/**
 * Rastros externos de un registro que se acaba de borrar DEFINITIVAMENTE: su puntero de sync y su outbox
 * pendiente. Mismo motivo que en `deleteTasks`, y no es cosmético:
 *
 *  - `external_identities` huérfana ⇒ el sync resuelve la identidad, hace `UPDATE … WHERE id = <muerto>`,
 *    toca 0 filas, cuenta "actualizado" y el registro **no vuelve a aparecer nunca** aunque siga existiendo en
 *    GitHub/Twenty/Notion. Silencioso y permanente.
 *  - `outbox_events` pendiente ⇒ el worker intentaría empujar a Notion/Twenty algo que ya no existe.
 *
 * Hasta M40 la purga por retención no limpiaba ninguna de las dos (sólo lo hacía el borrado de tareas).
 */
async function deleteExternalTraces(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  id: string,
): Promise<void> {
  await db
    .delete(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.internalType, entityType),
        eq(externalIdentities.internalId, id),
      ),
    );
  await db
    .delete(outboxEvents)
    .where(and(eq(outboxEvents.aggregateType, entityType), eq(outboxEvents.aggregateId, id)));
}

/**
 * Purga (borrado DEFINITIVO) de los registros archivados hace más de `retentionDays` días, en TODAS las
 * entidades archivables. `retentionDays <= 0` (o null) ⇒ no borra nada ("conservar siempre"). Cada borrado
 * deja rastro en `audit_logs` (acción DELETE, `metadata.reason = 'archived-retention'`).
 *
 * Se hace en **varias pasadas**: dentro de una misma tabla hay auto-referencias (subtarea→tarea,
 * decisión→decisión superseded, objetivo→objetivo padre) y el orden entre filas hermanas no se puede fijar de
 * antemano; si una pasada borra al hijo, la siguiente ya puede borrar al padre. Se para en cuanto una pasada no
 * borra nada. Lo que queda bloqueado es porque **un registro NO archivado lo sigue usando** (p. ej. una tarea
 * viva dentro de un proyecto archivado): eso se conserva a propósito y se devuelve en `blocked` para poder
 * decirlo, en vez de tragárselo en silencio como antes.
 */
export async function purgeArchivedRecords(
  db: Database,
  ctx: OrgContext,
  opts: { retentionDays: number; now?: Date },
): Promise<{ deleted: number; skipped: number; blocked: Record<string, number> }> {
  requireCan(ctx.role, 'delete');
  if (!opts.retentionDays || opts.retentionDays <= 0) return { deleted: 0, skipped: 0, blocked: {} };
  const cutoff = new Date((opts.now ?? new Date()).getTime() - opts.retentionDays * 86_400_000);

  let deleted = 0;
  let blocked: Record<string, number> = {};
  // Tope de pasadas: con el orden correcto, las auto-referencias son la única causa de reintento y las cadenas
  // reales son cortas. El bucle para antes en cuanto una pasada no avanza.
  for (let pass = 0; pass < 5; pass++) {
    let deletedThisPass = 0;
    blocked = {};
    for (const entityType of PURGE_ORDER) {
      const meta = ARCHIVABLE[entityType];
      if (!meta) continue;
      const c = meta.table as unknown as ArchivableCols;
      const rows = (await db
        .select({ id: c.id, name: meta.nameCol })
        .from(meta.table)
        .where(and(orgEq(c.organizationId, ctx), isNotNull(c.archivedAt), lt(c.archivedAt, cutoff)))) as {
        id: string;
        name: string | null;
      }[];
      for (const r of rows) {
        try {
          await deleteDependents(db, ctx, entityType, String(r.id));
          await db.delete(meta.table).where(and(eq(c.id, r.id), orgEq(c.organizationId, ctx)));
          // DESPUÉS del borrado (si la FK lo bloquea, la fila sigue viva y su puntero tiene que seguir ahí).
          await deleteExternalTraces(db, ctx, entityType, String(r.id));
          await recordAudit(db, ctx, {
            action: 'DELETE',
            entityType,
            entityId: String(r.id),
            metadata: { reason: 'archived-retention', name: r.name, retentionDays: opts.retentionDays },
          });
          deleted++;
          deletedThisPass++;
        } catch (e) {
          // Sigue referenciado por otra fila (FK) u otro impedimento → se conserva archivado. Se cuenta por
          // entidad y se deja en el log del servidor: sin esto, un bloqueo permanente era invisible.
          blocked[entityType] = (blocked[entityType] ?? 0) + 1;
          logger.warn('purga de archivados: registro conservado', {
            entityType,
            entityId: String(r.id),
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
    if (deletedThisPass === 0) break;
  }
  const skipped = Object.values(blocked).reduce((a, b) => a + b, 0);
  return { deleted, skipped, blocked };
}

/** Lista lo archivado, agrupado por entidad (solo grupos con ≥1). Para la vista "Archivados". */
export async function listArchived(db: Database, ctx: OrgContext): Promise<ArchivedGroup[]> {
  const groups = await Promise.all(
    Object.entries(ARCHIVABLE).map(async ([entityType, meta]) => {
      const c = meta.table as unknown as ArchivableCols;
      const items = (await db
        .select({ id: c.id, name: meta.nameCol, archivedAt: c.archivedAt })
        .from(meta.table)
        .where(and(orgEq(c.organizationId, ctx), isNotNull(c.archivedAt)))
        .orderBy(desc(c.archivedAt))) as ArchivedGroup['items'];
      return { entityType, label: meta.label, items };
    }),
  );
  return groups.filter((g) => g.items.length > 0);
}


/**
 * Resuelve el NOMBRE de varias entidades a la vez (una query por tipo, con `inArray`), para poder decir «Actualizó el
 * proyecto “Web Acme”» en vez de «Actualizó proyecto». Usa el mismo mapa que el archivado, que ya sabe qué columna es
 * el nombre de cada tabla. Devuelve un mapa `"<tipo>:<id>" → nombre`; lo que no se resuelva (borrado, tipo sin mapa)
 * simplemente no aparece y el llamador se queda con la etiqueta genérica.
 */
export async function resolveEntityNames(
  db: Database,
  ctx: OrgContext,
  refs: { entityType: string; entityId: string }[],
): Promise<Map<string, string>> {
  const byType = new Map<string, string[]>();
  for (const r of refs) {
    if (!ARCHIVABLE[r.entityType] || !r.entityId) continue;
    const list = byType.get(r.entityType) ?? [];
    list.push(r.entityId);
    byType.set(r.entityType, list);
  }
  const out = new Map<string, string>();
  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const meta = ARCHIVABLE[type]!;
      const c = meta.table as unknown as ArchivableCols;
      const rows = await db
        .select({ id: c.id, name: meta.nameCol })
        .from(meta.table)
        .where(and(orgEq(c.organizationId, ctx), inArray(c.id, [...new Set(ids)])));
      for (const row of rows) {
        if (row.name) out.set(`${type}:${row.id}`, String(row.name));
      }
    }),
  );
  return out;
}
