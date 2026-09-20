import { and, eq, asc, desc, count, sql, isNotNull, isNull, inArray, notInArray, lt, or } from 'drizzle-orm';
import type { Database } from '@ct/db';
import {
  projects,
  projectPhases,
  tasks,
  deliverables,
  clients,
  contacts,
  opportunities,
  assets,
  projectAssets,
} from '@ct/db/schema';
import {
  deriveProjectHealth,
  computeProgress,
  ACTIVE_TASK_STATUSES,
  CLOSED_PROJECT_STATUSES,
  CLOSED_OPPORTUNITY_STAGES,
  type ProjectHealth,
  type ProjectStatus,
} from '@ct/domain';

/**
 * Condición (para queries que hacen leftJoin de `projects`): la tarea NO pertenece a un proyecto cerrado/
 * archivado. Las tareas personales o de oportunidad no tienen proyecto (projectId NULL) → se conservan.
 */
function notInClosedProject() {
  return or(
    isNull(tasks.projectId),
    and(notInArray(projects.status, [...CLOSED_PROJECT_STATUSES]), isNull(projects.archivedAt)),
  );
}
import { orgEq, type OrgContext } from '../auth/index';
import { notFound } from '../errors';
import { rowCap } from '../list-limit';

/** Consultas del módulo Projects, con datos derivados (health, progress). */

type ProjectRow = typeof projects.$inferSelect;
export interface ProjectWithDerived extends ProjectRow {
  taskTotal: number;
  taskDone: number;
  progress: number;
  health: ProjectHealth;
  clientName: string | null;
  contactName: string | null;
}

/** Nombre mostrable de un contacto: "Nombre Apellido" o email. */
function contactLabel(c: { firstName: string | null; lastName: string | null; email: string | null }): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email || '(contacto)';
}

/** Cuenta tasks (total y done) por proyecto para una organización. */
async function taskCountsByProject(db: Database, ctx: OrgContext) {
  const rows = await db
    .select({
      projectId: tasks.projectId,
      total: count(),
      done: sql<number>`sum(case when ${tasks.status} = 'DONE' then 1 else 0 end)`,
    })
    .from(tasks)
    // Solo tareas de nivel superior (sin subtareas), coherente con el progreso de la ficha del proyecto.
    .where(and(orgEq(tasks.organizationId, ctx), isNotNull(tasks.projectId), isNull(tasks.parentTaskId)))
    .groupBy(tasks.projectId);
  const map = new Map<string, { total: number; done: number }>();
  for (const r of rows) {
    if (r.projectId) map.set(r.projectId, { total: Number(r.total), done: Number(r.done) });
  }
  return map;
}

function enrich(
  p: ProjectRow,
  counts: { total: number; done: number } | undefined,
  now: Date,
  clientName: string | null,
  contactName: string | null,
): ProjectWithDerived {
  const total = counts?.total ?? 0;
  const done = counts?.done ?? 0;
  return {
    ...p,
    taskTotal: total,
    taskDone: done,
    progress: computeProgress(done, total),
    health: deriveProjectHealth({ status: p.status as ProjectStatus, targetDate: p.targetDate }, now),
    clientName,
    contactName,
  };
}

export async function listProjects(
  db: Database,
  ctx: OrgContext,
  filter?: { clientId?: string; type?: string },
): Promise<ProjectWithDerived[]> {
  const now = new Date();
  const where = and(
    orgEq(projects.organizationId, ctx),
    isNull(projects.archivedAt),
    filter?.clientId ? eq(projects.clientId, filter.clientId) : undefined,
    filter?.type ? eq(projects.type, filter.type) : undefined,
  );
  const [rows, counts, clientRows, contactRows] = await Promise.all([
    db.select().from(projects).where(where).orderBy(desc(projects.createdAt)),
    taskCountsByProject(db, ctx),
    db.select({ id: clients.id, name: clients.name }).from(clients).where(orgEq(clients.organizationId, ctx)),
    db.select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email }).from(contacts).where(orgEq(contacts.organizationId, ctx)),
  ]);
  const clientById = new Map(clientRows.map((c) => [c.id, c.name]));
  const contactById = new Map(contactRows.map((c) => [c.id, contactLabel(c)]));
  return rows.map((p) =>
    enrich(
      p,
      counts.get(p.id),
      now,
      p.clientId ? (clientById.get(p.clientId) ?? null) : null,
      p.contactId ? (contactById.get(p.contactId) ?? null) : null,
    ),
  );
}

export async function getProjectDetail(db: Database, ctx: OrgContext, id: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)));
  if (!project) throw notFound('project');

  const [phases, projectTasks, projectDeliverables] = await Promise.all([
    db.select().from(projectPhases).where(eq(projectPhases.projectId, id)).orderBy(asc(projectPhases.sortOrder)),
    db
      .select()
      .from(tasks)
      // Solo tareas de nivel superior: las subtareas se ven dentro de su tarea madre, no en la ficha del proyecto.
      .where(and(eq(tasks.projectId, id), orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId)))
      .orderBy(desc(tasks.createdAt)),
    db
      .select()
      .from(deliverables)
      .where(and(eq(deliverables.projectId, id), orgEq(deliverables.organizationId, ctx), isNull(deliverables.archivedAt)))
      .orderBy(desc(deliverables.createdAt)),
  ]);

  const done = projectTasks.filter((t) => t.status === 'DONE').length;
  const clientName = project.clientId
    ? ((await db.select({ name: clients.name }).from(clients).where(and(eq(clients.id, project.clientId), orgEq(clients.organizationId, ctx))))[0]?.name ?? null)
    : null;
  const contactRow = project.contactId
    ? (await db.select({ firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email }).from(contacts).where(and(eq(contacts.id, project.contactId), orgEq(contacts.organizationId, ctx))))[0]
    : undefined;
  const contactName = contactRow ? contactLabel(contactRow) : null;
  const enriched = enrich(project, { total: projectTasks.length, done }, new Date(), clientName, contactName);

  return { project: enriched, phases, tasks: projectTasks, deliverables: projectDeliverables };
}

export async function getTask(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), orgEq(tasks.organizationId, ctx)));
  if (!row) throw notFound('task');
  return row;
}

export async function getDeliverable(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, id), orgEq(deliverables.organizationId, ctx)));
  if (!row) throw notFound('deliverable');
  return row;
}

/**
 * Todas las tareas ACTIVAS de la org (TODO/IN_PROGRESS/BLOCKED) con el nombre de su proyecto, para la
 * vista global de tareas (Fase 4). El bucketing por fecha/prioridad se hace en la capa de presentación.
 */
export function listActiveTasks(db: Database, ctx: OrgContext, limit?: number) {
  // Sólo tareas de nivel superior (las subtareas viven dentro del detalle de su tarea).
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      personal: tasks.personal,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    // Las tareas de oportunidad tienen su propia vista (/crm/opportunities/tasks) → aquí se excluyen.
    // Se excluyen también las de proyectos cerrados/archivados (trabajo terminado).
    .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), isNull(tasks.opportunityId), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), notInClosedProject()))
    .orderBy(asc(tasks.dueDate))
    .limit(rowCap(limit));
}

/**
 * Tareas VENCIDAS de la org (fecha anterior a `today`) para la sección "Vencidas" de la vista global (/tasks).
 * A diferencia de `listActiveTasks`, INCLUYE subtareas y tareas de oportunidad (preventa) — igual que el
 * dashboard de Home —, porque una tarea vencida hay que reprogramarla exista donde exista. Trae el nombre del
 * proyecto y de la oportunidad para etiquetar su origen. `today` en formato 'YYYY-MM-DD' (zona horaria de la org).
 */
export function listOverdueTasks(db: Database, ctx: OrgContext, today: string, limit?: number) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      opportunityId: tasks.opportunityId,
      opportunityName: opportunities.name,
      parentTaskId: tasks.parentTaskId,
      personal: tasks.personal,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(opportunities, eq(opportunities.id, tasks.opportunityId))
    // Excluye subtareas: solo viven dentro de su tarea madre (en Home sí aparecen las subtareas vencidas).
    // Excluye también las de proyectos cerrados/archivados.
    .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), isNotNull(tasks.dueDate), lt(tasks.dueDate, today), notInClosedProject()))
    .orderBy(asc(tasks.dueDate))
    .limit(rowCap(limit));
}

/** Estado de un proyecto (o null si no existe/otra org). Ligero: para saber si está CLOSED (congelado). */
export async function getProjectStatus(db: Database, ctx: OrgContext, id: string): Promise<string | null> {
  const [row] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)));
  return row?.status ?? null;
}

/** Tareas cerradas (DONE + CANCELLED) de nivel superior, para la pestaña "Completadas" de /tasks. */
export function listCompletedTasks(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      projectId: tasks.projectId,
      projectName: projects.name,
      personal: tasks.personal,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    // Excluye también las de proyectos cerrados/archivados: si el proyecto ya no está activo, sus tareas
    // (hechas o canceladas) no tienen sentido en la lista universal — igual que en las vistas de activas/vencidas.
    .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), isNull(tasks.opportunityId), inArray(tasks.status, ['DONE', 'CANCELLED']), notInClosedProject()))
    // Recencia de cierre: las canceladas no tienen completedAt (solo se setea en DONE) → coalesce con updatedAt.
    .orderBy(desc(sql`coalesce(${tasks.completedAt}, ${tasks.updatedAt})`))
    .limit(rowCap(limit));
}

/** Una fase de proyecto (para el panel de edición). Verifica pertenencia a la org vía su proyecto. */
export async function getProjectPhase(db: Database, ctx: OrgContext, id: string) {
  const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
  if (!phase) throw notFound('project_phase');
  const [proj] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, phase.projectId), orgEq(projects.organizationId, ctx)));
  if (!proj) throw notFound('project_phase');
  return phase;
}

/** Subtareas (hijas) de una tarea, todas (incluidas completadas), para el detalle. */
export function listSubtasks(db: Database, ctx: OrgContext, parentTaskId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), eq(tasks.parentTaskId, parentTaskId)))
    .orderBy(asc(tasks.createdAt));
}

export function listProjectTasks(db: Database, ctx: OrgContext, projectId: string) {
  return db
    .select()
    .from(tasks)
    // Solo tareas de nivel superior: las subtareas viven dentro de su tarea madre, no en la lista del proyecto.
    .where(and(eq(tasks.projectId, projectId), orgEq(tasks.organizationId, ctx), isNull(tasks.parentTaskId)))
    .orderBy(desc(tasks.createdAt));
}

/** Tareas de UNA oportunidad (para su ficha). Mismo criterio que las de proyecto: excluye archivadas. */
export function listOpportunityTasks(db: Database, ctx: OrgContext, opportunityId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.opportunityId, opportunityId), orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt)))
    .orderBy(desc(tasks.createdAt));
}

/**
 * TODAS las tareas de PREVENTA de la org (vista global). Une el nombre de la oportunidad. Oculta las tareas de
 * oportunidades **cerradas** (stage en la columna «Cerradas»: LOST/ONBOARDED) y **archivadas**. Se conservan
 * las de oportunidades abiertas (OPEN) y ganadas activas (WON no archivadas, con el traspaso al proyecto en marcha).
 */
export function listAllOpportunityTasks(db: Database, ctx: OrgContext, limit?: number) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      parentTaskId: tasks.parentTaskId,
      opportunityId: tasks.opportunityId,
      opportunityName: opportunities.name,
      opportunityArchivedAt: opportunities.archivedAt,
    })
    .from(tasks)
    .innerJoin(opportunities, eq(tasks.opportunityId, opportunities.id))
    .where(
      and(
        orgEq(tasks.organizationId, ctx),
        isNotNull(tasks.opportunityId),
        isNull(tasks.archivedAt),
        isNull(opportunities.archivedAt),
        notInArray(opportunities.stage, [...CLOSED_OPPORTUNITY_STAGES]),
      ),
    )
    .orderBy(desc(tasks.createdAt))
    .limit(rowCap(limit));
}


/** A-3 (ADR-007) — activos reutilizables enlazados a un proyecto (join por la tabla puente). */
export function listProjectAssets(db: Database, ctx: OrgContext, projectId: string) {
  return db
    .select({
      id: assets.id,
      name: assets.name,
      assetType: assets.assetType,
      status: assets.status,
      version: assets.version,
      externalUrl: assets.externalUrl,
      repositoryUrl: assets.repositoryUrl,
      linkedAt: projectAssets.createdAt,
    })
    .from(projectAssets)
    .innerJoin(assets, eq(assets.id, projectAssets.assetId))
    .where(and(eq(projectAssets.projectId, projectId), orgEq(assets.organizationId, ctx)))
    .orderBy(asc(assets.name));
}

/** A-3 (ADR-007) — rollup inverso: en qué proyectos se usa un activo. */
export function listAssetProjects(db: Database, ctx: OrgContext, assetId: string) {
  return db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projectAssets)
    .innerJoin(projects, eq(projects.id, projectAssets.projectId))
    .where(and(eq(projectAssets.assetId, assetId), orgEq(projects.organizationId, ctx)))
    .orderBy(asc(projects.name));
}
