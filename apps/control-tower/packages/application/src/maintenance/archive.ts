import { and, eq, lt, inArray, isNull, isNotNull, desc, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { z } from '@ct/validation';
import type { Database, DbOrTx } from '@ct/db';
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
  auditLogs,
} from '@ct/db/schema';
import { isExternallyArchived, TERMINAL_STATUS, TERMINAL_ARCHIVE_AFTER_DAYS } from '@ct/domain';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { isSystemActor, recordAudit } from '../audit/index';
import { deleteNotesFor } from '../notes/index';
import { archivedByOrigin, mapDbError, notFound } from '../errors';
import { logger } from '@ct/shared';

/**
 * Archivado en lote (soft-delete reversible) vía `archivedAt`. `ARCHIVABLE` (entityType→tabla + columna de nombre +
 * etiqueta) es también la allowlist de seguridad: solo se puede archivar/restaurar/listar lo que esté aquí. Las claves
 * = entityType de auditoría. Requiere rol `delete` (ADMIN+). `nameCol` = columna a mostrar en la vista "Archivados".
 */
interface ArchivableMeta {
  table: PgTable;
  /**
   * Qué mostrar como «nombre» en «Archivados» y en la actividad reciente. Casi siempre es una columna; en los
   * contactos es una expresión, porque su nombre está repartido en dos columnas y antes se listaban por **email**
   * (los que no tenían salían como «(sin nombre)» aunque sí tuvieran nombre).
   */
  nameCol: AnyPgColumn | SQL<string>;
}
export const ARCHIVABLE: Record<string, ArchivableMeta> = {
  task: { table: tasks, nameCol: tasks.title },
  project: { table: projects, nameCol: projects.name },
  deliverable: { table: deliverables, nameCol: deliverables.name },
  resource: { table: resources, nameCol: resources.name },
  client: { table: clients, nameCol: clients.name },
  contact: {
    table: contacts,
    nameCol: sql<string>`coalesce(nullif(trim(concat_ws(' ', ${contacts.firstName}, ${contacts.lastName})), ''), ${contacts.email})`,
  },
  opportunity: { table: opportunities, nameCol: opportunities.name },
  strategic_area: { table: strategicAreas, nameCol: strategicAreas.name },
  goal: { table: goals, nameCol: goals.name },
  capability: { table: capabilities, nameCol: capabilities.name },
  service: { table: services, nameCol: services.name },
  decision: { table: decisions, nameCol: decisions.title },
  knowledge_item: { table: knowledgeItems, nameCol: knowledgeItems.title },
  document: { table: documents, nameCol: documents.name },
  asset: { table: assets, nameCol: assets.name },
  portfolio_item: { table: portfolioItems, nameCol: portfolioItems.name },
  learning_item: { table: learningItems, nameCol: learningItems.title },
  payment: { table: payments, nameCol: payments.concept },
  review_item: { table: reviewItems, nameCol: reviewItems.title },
};

/** Columnas comunes a toda tabla archivable (todas llevan id/organization_id/archived_at). */
type ArchivableCols = { id: AnyPgColumn; organizationId: AnyPgColumn; archivedAt: AnyPgColumn };

const idsSchema = z.object({
  entityType: z.string(),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * **Hijos que se archivan con su padre** (owner 2026-09-27). Sin esto, archivar un proyecto lo sacaba de la lista y
 * dejaba sus tareas y entregables vivos: seguían contando en las vistas globales y —peor— **bloqueaban la purga para
 * siempre**, porque su FK impide borrar el proyecto (el barrido lo contaba en `blocked` y lo reintentaba a diario sin
 * avanzar nunca).
 *
 * Sólo van aquí los hijos que **no significan nada sin su padre**: las tareas y los entregables de un proyecto
 * (`deliverables.project_id` es NOT NULL), las subtareas de una tarea y las tareas de preventa de una oportunidad.
 * Documentos, recursos, decisiones y elementos de portafolio NO: apuntan a un proyecto pero existen por su cuenta
 * (un recurso puede ser del cliente, una decisión de un servicio), así que se archivan aparte y, si aún referencian
 * al padre, la purga lo dice.
 */
const ARCHIVE_CASCADE: Record<string, { table: PgTable; fk: AnyPgColumn; entityType: string }[]> = {
  project: [
    { table: tasks, fk: tasks.projectId, entityType: 'task' },
    { table: deliverables, fk: deliverables.projectId, entityType: 'deliverable' },
  ],
  task: [{ table: tasks, fk: tasks.parentTaskId, entityType: 'task' }],
  opportunity: [{ table: tasks, fk: tasks.opportunityId, entityType: 'task' }],
};

/** Pares padre→hijo de la cascada, para el test de regresión (todo hijo tiene que ser archivable). */
export function archiveCascadePairs(): { parent: string; child: string }[] {
  return Object.entries(ARCHIVE_CASCADE).flatMap(([parent, children]) =>
    children.map((c) => ({ parent, child: c.entityType })),
  );
}

/**
 * Propaga el archivado (o el desarchivado) a los hijos declarados en `ARCHIVE_CASCADE`. **Punto único**: lo usan el
 * archivado a mano, el barrido de estados terminales y el del ciclo de vida de las oportunidades.
 *
 * Al archivar, los hijos reciben **la misma marca de tiempo** que el padre. Eso no es cosmético: al restaurar sólo se
 * desarchivan los hijos con ESA marca, así que un hijo que estaba archivado de antes (a mano, o con otro padre) no
 * revive por rebote. `value = null` exige por eso el `previous` (la marca que tenía el padre).
 */
export async function cascadeArchive(
  db: DbOrTx,
  ctx: OrgContext,
  entityType: string,
  parentIds: string[],
  value: Date | null,
  previous?: Date | null,
): Promise<number> {
  const children = ARCHIVE_CASCADE[entityType];
  if (!children || parentIds.length === 0) return 0;
  let touched = 0;
  for (const child of children) {
    const c = child.table as unknown as ArchivableCols;
    const rows = await db
      .update(child.table)
      .set({ archivedAt: value })
      .where(
        and(
          orgEq(c.organizationId, ctx),
          inArray(child.fk, parentIds),
          // Al archivar: sólo lo que esté vivo. Al restaurar: sólo lo que se archivó EN ESA MISMA operación.
          value === null
            ? previous
              ? eq(c.archivedAt, previous)
              : isNotNull(c.archivedAt)
            : isNull(c.archivedAt),
        ),
      )
      .returning({ id: c.id });
    for (const r of rows) {
      await recordAudit(db, ctx, {
        action: value === null ? 'RESTORE' : 'ARCHIVE',
        entityType: child.entityType,
        entityId: String(r.id),
        metadata: { reason: 'cascade', parentType: entityType },
      });
    }
    touched += rows.length;
  }
  return touched;
}

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
  // Lo que llega de Twenty no lo archiva ni lo restaura una PERSONA: aparece o desaparece según lo que viva allí.
  // El sync (actor SYSTEM) sí puede: es quien archiva lo que dejó de venir en el pull y quien mueve una Person que
  // cambia de rol (ADR-010). Mismo patrón que `createOpportunity`, que rechaza al usuario y deja pasar al sistema.
  if (isExternallyArchived(entityType) && !isSystemActor(ctx)) throw archivedByOrigin();
  const c = meta.table as unknown as ArchivableCols;
  const onlyMatching = value === null ? isNotNull(c.archivedAt) : isNull(c.archivedAt);
  try {
    return await db.transaction(async (tx) => {
      // Marcas de archivado ANTES de tocar nada. Hace falta para restaurar la cascada con exactitud, y no se puede
      // sacar del `RETURNING`: Postgres devuelve la fila **nueva**, donde `archived_at` ya es null.
      const before =
        value === null
          ? ((await tx
              .select({ id: c.id, archivedAt: c.archivedAt })
              .from(meta.table)
              .where(
                and(inArray(c.id, ids), orgEq(c.organizationId, ctx), isNotNull(c.archivedAt)),
              )) as { id: string; archivedAt: Date | null }[])
          : [];
      const rows = (await tx
        .update(meta.table)
        .set({ archivedAt: value })
        .where(and(inArray(c.id, ids), orgEq(c.organizationId, ctx), onlyMatching))
        .returning({ id: c.id })) as { id: string }[];
      for (const r of rows) {
        await recordAudit(tx, ctx, {
          action: value === null ? 'RESTORE' : 'ARCHIVE',
          entityType,
          entityId: String(r.id),
        });
      }
      // Los hijos van con su padre, en la MISMA transacción: si falla algo, no queda un proyecto archivado con sus
      // tareas vivas (que es justo lo que bloqueaba la purga).
      if (rows.length > 0) {
        if (value === null) {
          // Restaurar va de uno en uno: cada padre se archivó en un momento distinto y sólo sus hijos de ESA marca
          // vuelven con él (un hijo archivado por su cuenta se queda archivado).
          for (const b of before) await cascadeArchive(tx, ctx, entityType, [String(b.id)], null, b.archivedAt);
        } else {
          await cascadeArchive(tx, ctx, entityType, rows.map((r) => String(r.id)), value);
        }
      }
      return rows.length;
    });
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
  /** `false` para lo que gobierna el origen (CRM de Twenty): ahí no se ofrece restaurar. */
  restorable: boolean;
  items: { id: string; name: string | null; archivedAt: Date | null; reason: string | null }[];
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
 * Todo lo que hay que llevarse de un registro que se acaba de borrar DEFINITIVAMENTE. **Punto único**: lo
 * llaman los tres caminos de borrado duro (esta purga, `deleteTasks` y la purga de tareas completadas), porque
 * acordarse tres veces es exactamente cómo se cuela el siguiente olvido.
 *
 *  - `external_identities` huérfana ⇒ el sync resuelve la identidad, hace `UPDATE … WHERE id = <muerto>`,
 *    toca 0 filas, cuenta "actualizado" y el registro **no vuelve a aparecer nunca** aunque siga existiendo en
 *    GitHub/Twenty/Notion. Silencioso y permanente (M40).
 *  - `outbox_events` pendiente ⇒ el worker intentaría empujar a Notion/Twenty algo que ya no existe.
 *  - `notes` (E-15) ⇒ la tabla es polimórfica, no hay FK que las arrastre: sin esto la nota queda huérfana
 *    para siempre y sin ninguna pantalla desde la que verla ni borrarla.
 *
 * Lo que NO se borra a propósito: `audit_logs` y `change_events`, que son el registro histórico inmutable.
 */
export async function deleteRecordTraces(
  db: DbOrTx,
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
  await deleteNotesFor(db, ctx, entityType, [id]);
}

/**
 * Borrado DEFINITIVO de una fila archivada, con todo lo que hay que llevarse. Devuelve `false` —sin lanzar— si la
 * base lo impide, que en la práctica significa **una fila viva la sigue referenciando** (una tarea dentro de un
 * proyecto archivado). Se conserva archivada a propósito: es el único caso en que no borrar es lo correcto.
 *
 * Punto único de los dos caminos de purga: el barrido por retención y el borrado a mano desde «Archivados».
 */
async function hardDelete(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  id: string,
  metadata: Record<string, unknown>,
): Promise<boolean> {
  const meta = ARCHIVABLE[entityType]!;
  const c = meta.table as unknown as ArchivableCols;
  try {
    await deleteDependents(db, ctx, entityType, id);
    await db.delete(meta.table).where(and(eq(c.id, id), orgEq(c.organizationId, ctx)));
    // DESPUÉS del borrado (si la FK lo bloquea, la fila sigue viva y su puntero tiene que seguir ahí).
    await deleteRecordTraces(db, ctx, entityType, id);
    await recordAudit(db, ctx, { action: 'DELETE', entityType, entityId: id, metadata });
    return true;
  } catch (e) {
    logger.warn('borrado definitivo: registro conservado', {
      entityType,
      entityId: id,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Borra los hijos ARCHIVADOS de un registro antes de borrarlo a él. Si no, la FK del hijo bloquea al padre y la
 * purga a mano de un proyecto no llegaba nunca a borrarlo (lo encontró el journey J17): archivar arrastra a los
 * hijos, así que borrar tiene que arrastrarlos igual. Es recursiva por las subtareas (tarea → tarea).
 *
 * Sólo toca hijos **archivados**: uno vivo se conserva y deja al padre bloqueado, que es lo correcto — hay trabajo
 * en curso dentro.
 */
async function purgeCascade(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  id: string,
  /**
   * Lo ya procesado. Hace falta porque una misma fila cuelga de DOS padres de la cascada: una **subtarea** apunta a
   * su tarea madre (`parent_task_id`) y al proyecto (`project_id`), así que sin esto se borraba una vez y se contaba
   * dos (el borrado de una fila que ya no está no falla). Lo cazó el journey J17 con un `deleted` inflado.
   */
  seen: Set<string> = new Set(),
): Promise<number> {
  const children = ARCHIVE_CASCADE[entityType];
  if (!children) return 0;
  let deleted = 0;
  for (const child of children) {
    const c = child.table as unknown as ArchivableCols;
    const rows = (await db
      .select({ id: c.id })
      .from(child.table)
      .where(and(orgEq(c.organizationId, ctx), eq(child.fk, id), isNotNull(c.archivedAt)))) as { id: string }[];
    for (const r of rows) {
      const key = `${child.entityType}:${String(r.id)}`;
      if (String(r.id) === id || seen.has(key)) continue;
      seen.add(key);
      deleted += await purgeCascade(db, ctx, child.entityType, String(r.id), seen);
      if (await hardDelete(db, ctx, child.entityType, String(r.id), { reason: 'manual-purge-cascade', parentType: entityType })) {
        deleted++;
      }
    }
  }
  return deleted;
}

/**
 * **Borrar para siempre lo que ya está archivado**, por selección (owner 2026-09-27: «que exista un lugar donde
 * revisar esta lista con la posibilidad de eliminar para siempre»). Hasta ahora el borrado definitivo sólo existía
 * como política global por antigüedad, así que no había forma de decir «estos dos, ya».
 *
 * Sólo toca filas **archivadas**: un id vivo se ignora en silencio —no es un error del usuario, es que la lista que
 * tenía delante ya no estaba al día— y se devuelve en `skipped`. Lo que la base no deja borrar por una FK viva sale
 * en `blocked` para poder decirlo en pantalla.
 *
 * ⚠ Para lo que viene de un sistema externo, «para siempre» dura hasta el siguiente sync: borrar se lleva su
 * `external_identity`, que es toda la idempotencia, así que si el registro sigue existiendo en Twenty/Notion/GitHub
 * vuelve a crearse. Lo que se archivó porque desapareció del origen sí muere del todo.
 */
export async function purgeArchivedByIds(
  db: Database,
  ctx: OrgContext,
  input: unknown,
): Promise<{ deleted: number; blocked: number; skipped: number }> {
  requireCan(ctx.role, 'delete');
  const { entityType, ids } = idsSchema.parse(input);
  const meta = ARCHIVABLE[entityType];
  if (!meta) throw notFound('entity');
  const c = meta.table as unknown as ArchivableCols;
  const rows = (await db
    .select({ id: c.id, name: meta.nameCol })
    .from(meta.table)
    .where(and(inArray(c.id, ids), orgEq(c.organizationId, ctx), isNotNull(c.archivedAt)))) as {
    id: string;
    name: string | null;
  }[];
  let deleted = 0;
  let blocked = 0;
  for (const r of rows) {
    // Primero lo que cuelga de él y también está archivado (tareas y entregables de un proyecto, subtareas): su FK
    // bloquearía el borrado del padre.
    deleted += await purgeCascade(db, ctx, entityType, String(r.id));
    const ok = await hardDelete(db, ctx, entityType, String(r.id), { reason: 'manual-purge', name: r.name });
    if (ok) deleted++;
    else blocked++;
  }
  return { deleted, blocked, skipped: ids.length - rows.length };
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
        const ok = await hardDelete(db, ctx, entityType, String(r.id), {
          reason: 'archived-retention',
          name: r.name,
          retentionDays: opts.retentionDays,
        });
        if (ok) {
          deleted++;
          deletedThisPass++;
        } else {
          // Sigue referenciado por otra fila (FK) u otro impedimento → se conserva archivado. Se cuenta por
          // entidad: sin esto, un bloqueo permanente era invisible.
          blocked[entityType] = (blocked[entityType] ?? 0) + 1;
        }
      }
    }
    if (deletedThisPass === 0) break;
  }
  const skipped = Object.values(blocked).reduce((a, b) => a + b, 0);
  return { deleted, skipped, blocked };
}

/**
 * **Autoarchivado por estado terminal** (owner 2026-09-27: «los objetos que han llegado a un estado terminal … una
 * vez a la semana se mandan a una lista dedicada y desaparecen de la vista principal»).
 *
 * Recorre `TERMINAL_STATUS` (dominio) y archiva lo que lleve **7 días** en un estado de cierre —proyecto cerrado,
 * capacidad o servicio retirado, decisión sustituida, reutilizable obsoleto, y el viejo estado `ARCHIVED` de las ocho
 * entidades que lo ofrecían—. Arrastra a los hijos por `cascadeArchive`, así que un proyecto se lleva sus tareas y
 * entregables y el conjunto queda purgable de verdad.
 *
 * **La edad se mide con `updated_at`**, no con una columna nueva: no hay «cerrado el» en estas tablas y añadirla
 * obligaría a rellenarla hacia atrás. Tiene una propiedad útil: cualquier edición reinicia el reloj, así que algo que
 * sigues tocando no se archiva a tu espalda. El cambio de estado en sí queda en `change_events`.
 *
 * Idempotente y restart-safe: mira estado + antigüedad, no un temporizador. `now` inyectable para tests.
 */
export async function archiveTerminalRecords(
  db: Database,
  ctx: OrgContext,
  opts: { olderThanDays?: number; now?: Date } = {},
): Promise<{ archived: number; byEntity: Record<string, number> }> {
  requireCan(ctx.role, 'delete');
  const days = opts.olderThanDays ?? TERMINAL_ARCHIVE_AFTER_DAYS;
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const byEntity: Record<string, number> = {};
  let archived = 0;

  for (const [entityType, statuses] of Object.entries(TERMINAL_STATUS)) {
    const meta = ARCHIVABLE[entityType];
    if (!meta || statuses.length === 0) continue;
    const c = meta.table as unknown as ArchivableCols & { status: AnyPgColumn; updatedAt: AnyPgColumn };
    try {
      const rows = (await db
        .update(meta.table)
        .set({ archivedAt: now })
        .where(
          and(
            orgEq(c.organizationId, ctx),
            isNull(c.archivedAt),
            inArray(c.status, [...statuses]),
            lt(c.updatedAt, cutoff),
          ),
        )
        .returning({ id: c.id, name: meta.nameCol, status: c.status })) as {
        id: string;
        name: string | null;
        status: string;
      }[];
      if (rows.length === 0) continue;
      for (const r of rows) {
        await recordAudit(db, ctx, {
          action: 'ARCHIVE',
          entityType,
          entityId: String(r.id),
          metadata: { reason: 'terminal-status', status: r.status, name: r.name, olderThanDays: days },
        });
      }
      await cascadeArchive(db, ctx, entityType, rows.map((r) => String(r.id)), now);
      byEntity[entityType] = rows.length;
      archived += rows.length;
    } catch (e) {
      // Una entidad que falle no puede tumbar el barrido de las demás (mismo criterio que la purga).
      logger.warn('autoarchivado por estado: entidad omitida', {
        entityType,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { archived, byEntity };
}

/**
 * Lista lo archivado, agrupado por entidad (solo grupos con ≥1). Para la vista "Archivados".
 *
 * Trae también **por qué** está archivado cada uno, que es lo que hace la lista utilizable: no es lo mismo algo que
 * archivaste tú, algo que se retiró solo al cerrarse, o algo que **ya no existe en Twenty** (eso último es lo que de
 * verdad conviene borrar). El motivo sale del último `ARCHIVE` de auditoría (`metadata.reason`), que ya se escribía.
 */
export async function listArchived(db: Database, ctx: OrgContext): Promise<ArchivedGroup[]> {
  const groups = await Promise.all(
    Object.entries(ARCHIVABLE).map(async ([entityType, meta]) => {
      const c = meta.table as unknown as ArchivableCols;
      const rows = (await db
        .select({ id: c.id, name: meta.nameCol, archivedAt: c.archivedAt })
        .from(meta.table)
        .where(and(orgEq(c.organizationId, ctx), isNotNull(c.archivedAt)))
        .orderBy(desc(c.archivedAt))) as { id: string; name: string | null; archivedAt: Date | null }[];
      if (rows.length === 0) {
        return { entityType, restorable: !isExternallyArchived(entityType), items: [] };
      }
      // Un solo viaje por entidad: el motivo del ARCHIVE más reciente de cada fila.
      const trail = await db
        .select({ entityId: auditLogs.entityId, metadata: auditLogs.metadata, createdAt: auditLogs.createdAt })
        .from(auditLogs)
        .where(
          and(
            orgEq(auditLogs.organizationId, ctx),
            eq(auditLogs.entityType, entityType),
            eq(auditLogs.action, 'ARCHIVE'),
            inArray(
              auditLogs.entityId,
              rows.map((r) => String(r.id)),
            ),
          ),
        )
        .orderBy(desc(auditLogs.createdAt));
      const reasonById = new Map<string, string>();
      for (const a of trail) {
        const id = a.entityId ? String(a.entityId) : '';
        // `orderBy desc` + primer visto = el más reciente.
        if (id && !reasonById.has(id)) {
          reasonById.set(id, ((a.metadata as { reason?: string } | null)?.reason ?? 'manual'));
        }
      }
      return {
        entityType,
        restorable: !isExternallyArchived(entityType),
        items: rows.map((r) => ({ ...r, reason: reasonById.get(String(r.id)) ?? null })),
      };
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
