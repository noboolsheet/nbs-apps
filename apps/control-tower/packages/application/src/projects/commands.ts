import { and, eq, count, inArray, lt, isNotNull, max } from 'drizzle-orm';
import type { Database } from '@ct/db';
import {
  projects,
  projectPhases,
  tasks,
  deliverables,
  clients,
  contacts,
  opportunities,
  services,
  assets,
  projectAssets,
  externalIdentities,
  outboxEvents,
} from '@ct/db/schema';
import {
  slugify,
  assertProjectTransition,
  assertTaskTransition,
  assertDeliverableTransition,
  ACTIVE_TASK_STATUSES,
  isOpportunityStageClosed,
  type ProjectStatus,
  type ProjectType,
  type TaskStatus,
  type DeliverableStatus,
  type OpportunityStage,
} from '@ct/domain';
import { AppError, logger } from '@ct/shared';
import {
  createProjectSchema,
  createProjectPhaseSchema,
  updateProjectPhaseSchema,
  createTaskSchema,
  createDeliverableSchema,
  updateProjectSchema,
  updateTaskSchema,
  updateDeliverableSchema,
} from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { emitOutbox } from '../outbox/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { assertNotEditingOwnedFields } from '../integrations/identity';
import {
  mapDbError,
  notFound,
  projectClosed,
  opportunityArchived,
  opportunityClosed,
  projectClientRequired,
} from '../errors';

/** Casos de uso del módulo Projects. A-1 (ADR-005): `projects.type` existe desde la migración 0014 y el
 * invariante de dominio "un proyecto CLIENT requiere client" se aplica DURO en create/update. */

async function assertRefInOrg(
  db: Database,
  ctx: OrgContext,
  table: typeof clients | typeof contacts | typeof opportunities | typeof services,
  id: string | undefined,
  entity: string,
) {
  if (!id) return;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), orgEq(table.organizationId, ctx)));
  if (!row) throw notFound(entity);
}

async function loadProject(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)));
  if (!row) throw notFound('project');
  return row;
}

/** Congela las tareas de un proyecto CERRADO: rechaza si `projectId` apunta a un proyecto CLOSED. */
async function assertProjectNotClosed(db: Database, ctx: OrgContext, projectId: string | null | undefined) {
  if (!projectId) return;
  const [row] = await db
    .select({ status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), orgEq(projects.organizationId, ctx)));
  if (row?.status === 'CLOSED') throw projectClosed();
}

/** Congela las tareas de una oportunidad ARCHIVADA: rechaza si `opportunityId` apunta a una archivada. */
/** Congela las tareas de una oportunidad ARCHIVADA o CERRADA (columna "Cerradas"): rechaza cualquier cambio. */
async function assertOpportunityNotFrozen(db: Database, ctx: OrgContext, opportunityId: string | null | undefined) {
  if (!opportunityId) return;
  const [row] = await db
    .select({ archivedAt: opportunities.archivedAt, stage: opportunities.stage })
    .from(opportunities)
    .where(and(eq(opportunities.id, opportunityId), orgEq(opportunities.organizationId, ctx)));
  if (!row) return;
  if (row.archivedAt) throw opportunityArchived();
  if (isOpportunityStageClosed(row.stage as OpportunityStage)) throw opportunityClosed();
}

export async function createProject(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createProjectSchema.parse(input);
  // Un proyecto personal (del owner para sí mismo) no lleva cliente/contacto/oportunidad/servicio.
  if (data.personal) {
    data.clientId = undefined;
    data.contactId = undefined;
    data.opportunityId = undefined;
    data.serviceId = undefined;
    data.type = 'INTERNAL'; // un proyecto personal nunca es de cliente
  }
  // A-1 (ADR-005): invariante duro — CLIENT exige cliente.
  if (data.type === 'CLIENT' && !data.clientId) throw projectClientRequired();
  await assertRefInOrg(db, ctx, clients, data.clientId, 'client');
  await assertRefInOrg(db, ctx, contacts, data.contactId, 'contact');
  await assertRefInOrg(db, ctx, opportunities, data.opportunityId, 'opportunity');
  await assertRefInOrg(db, ctx, services, data.serviceId, 'service');
  const slug = data.slug ?? slugify(data.name);
  try {
    // Atomicidad: INSERT + recordAudit (que encola el push a Notion) en la misma transacción.
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projects)
        .values({
          organizationId: ctx.organizationId,
          name: data.name,
          slug,
          description: data.description,
          clientId: data.clientId,
          contactId: data.contactId,
          opportunityId: data.opportunityId,
          serviceId: data.serviceId,
          status: data.status,
          type: data.type,
          priority: data.priority,
          personal: data.personal,
          startDate: data.startDate?.toISOString().slice(0, 10),
          targetDate: data.targetDate?.toISOString().slice(0, 10),
        })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'project', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'project' });
  }
}

/** Edición de metadatos del proyecto (el estado va por `changeProjectStatus`). */
export async function updateProject(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateProjectSchema.parse(input);
  // Al marcar el proyecto como personal se limpian cliente/contacto/oportunidad/servicio (no aplican).
  if (data.personal === true) {
    data.clientId = null;
    data.contactId = null;
    data.opportunityId = null;
    data.serviceId = null;
    data.type = 'INTERNAL'; // un proyecto personal nunca es de cliente
  }
  const current = await loadProject(db, ctx, id); // existe + org
  // A-1 (ADR-005): invariante duro sobre el estado RESULTANTE (tipo y cliente pueden cambiar en el mismo PATCH,
  // o cambiar sólo uno de los dos: hay que mirar el valor que quedará, no el que viene).
  const nextType = data.type ?? (current.type as ProjectType);
  const nextClientId = data.clientId !== undefined ? data.clientId : current.clientId;
  if (nextType === 'CLIENT' && !nextClientId) throw projectClientRequired();
  await assertRefInOrg(db, ctx, clients, data.clientId ?? undefined, 'client');
  await assertRefInOrg(db, ctx, contacts, data.contactId ?? undefined, 'contact');
  await assertRefInOrg(db, ctx, opportunities, data.opportunityId ?? undefined, 'opportunity');
  await assertRefInOrg(db, ctx, services, data.serviceId ?? undefined, 'service');

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.clientId !== undefined) set.clientId = data.clientId;
  if (data.contactId !== undefined) set.contactId = data.contactId;
  if (data.opportunityId !== undefined) set.opportunityId = data.opportunityId;
  if (data.serviceId !== undefined) set.serviceId = data.serviceId;
  if (data.type !== undefined) set.type = data.type;
  if (data.priority !== undefined) set.priority = data.priority;
  if (data.personal !== undefined) set.personal = data.personal;
  if (data.startDate !== undefined) set.startDate = data.startDate === null ? null : data.startDate.toISOString().slice(0, 10);
  if (data.targetDate !== undefined) set.targetDate = data.targetDate === null ? null : data.targetDate.toISOString().slice(0, 10);

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(projects)
        .set(set)
        .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo (además del audit "quién tocó qué").
      await recordFieldChanges(tx, ctx, { entityType: 'project', entityId: id, before: current, changed: set });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'project', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'project' });
  }
}

export async function changeProjectStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: ProjectStatus,
) {
  requireCan(ctx.role, 'write');
  const current = await loadProject(db, ctx, id);
  assertProjectTransition(current.status as ProjectStatus, status);

  // Invariante (doc 2 §14.11): un proyecto cerrado no debe tener tasks activas.
  if (status === 'CLOSED') {
    const activeRows = await db
      .select({ n: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, id),
          orgEq(tasks.organizationId, ctx),
          inArray(tasks.status, [...ACTIVE_TASK_STATUSES]),
        ),
      );
    const activeCount = activeRows[0]?.n ?? 0;
    if (activeCount > 0) {
      throw new AppError({
        code: 'PROJECT_HAS_ACTIVE_TASKS',
        kind: 'CONFLICT',
        message: `No se puede cerrar: el proyecto tiene ${activeCount} tarea(s) activa(s)`,
      });
    }
  }

  const completedAt = status === 'DELIVERED' || status === 'CLOSED' ? (current.completedAt ?? new Date()) : current.completedAt;

  // Transactional Outbox: el cambio de estado y el evento se escriben en la MISMA transacción.
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(projects)
      .set({ status, completedAt, updatedAt: new Date() })
      .where(and(eq(projects.id, id), orgEq(projects.organizationId, ctx)))
      .returning();
    await emitOutbox(tx, {
      organizationId: ctx.organizationId,
      eventType: 'project.status_changed',
      aggregateType: 'project',
      aggregateId: id,
      payload: { from: current.status, to: status, at: new Date().toISOString() },
    });
    await recordChangeEvent(tx, ctx, {
      entityType: 'project',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'project', entityId: id, metadata: { status } });
    return row!;
  });
}

export async function createProjectPhase(db: Database, ctx: OrgContext, projectId: string, input: unknown) {
  requireCan(ctx.role, 'write');
  await loadProject(db, ctx, projectId); // verifica pertenencia a la org
  const data = createProjectPhaseSchema.parse(input);
  // Orden: si no se indica, se autoasigna al final (última + 1) para que las fases nuevas queden ordenadas.
  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const [m] = await db.select({ max: max(projectPhases.sortOrder) }).from(projectPhases).where(eq(projectPhases.projectId, projectId));
    sortOrder = (m?.max ?? -1) + 1;
  }
  try {
    const [row] = await db
      .insert(projectPhases)
      .values({ projectId, name: data.name, description: data.description, status: data.status, sortOrder })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'project_phase', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'project_phase' });
  }
}

/** Carga una fase verificando (vía su proyecto) que pertenece a la org. Devuelve la fila. */
async function loadPhase(db: Database, ctx: OrgContext, phaseId: string) {
  const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, phaseId));
  if (!phase) throw notFound('project_phase');
  await loadProject(db, ctx, phase.projectId); // lanza notFound si el proyecto no es de la org
  return phase;
}

export async function updateProjectPhase(db: Database, ctx: OrgContext, phaseId: string, input: unknown) {
  requireCan(ctx.role, 'write');
  await loadPhase(db, ctx, phaseId);
  const data = updateProjectPhaseSchema.parse(input);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.status !== undefined) set.status = data.status;
  if (data.sortOrder !== undefined) set.sortOrder = data.sortOrder;
  try {
    const [row] = await db.update(projectPhases).set(set).where(eq(projectPhases.id, phaseId)).returning();
    await recordAudit(db, ctx, { action: 'UPDATE', entityType: 'project_phase', entityId: phaseId });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'project_phase' });
  }
}

/** Borra una fase. Si era la fase actual del proyecto, primero desmarca `currentPhaseId` (sin puntero colgado). */
export async function deleteProjectPhase(db: Database, ctx: OrgContext, phaseId: string) {
  requireCan(ctx.role, 'delete');
  const phase = await loadPhase(db, ctx, phaseId);
  return db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ currentPhaseId: null, updatedAt: new Date() })
      .where(and(eq(projects.id, phase.projectId), eq(projects.currentPhaseId, phaseId)));
    await tx.delete(projectPhases).where(eq(projectPhases.id, phaseId));
    await recordAudit(tx, ctx, { action: 'DELETE', entityType: 'project_phase', entityId: phaseId });
    return { deleted: true };
  });
}

/** Fija (o limpia, con `phaseId=null`) la fase actual del proyecto. Si se indica, la fase debe pertenecer al proyecto. */
export async function setCurrentPhase(db: Database, ctx: OrgContext, projectId: string, phaseId: string | null) {
  requireCan(ctx.role, 'write');
  await loadProject(db, ctx, projectId);
  if (phaseId) {
    const [phase] = await db
      .select({ id: projectPhases.id })
      .from(projectPhases)
      .where(and(eq(projectPhases.id, phaseId), eq(projectPhases.projectId, projectId)));
    if (!phase) throw notFound('project_phase');
  }
  const [row] = await db
    .update(projects)
    .set({ currentPhaseId: phaseId, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), orgEq(projects.organizationId, ctx)))
    .returning();
  await recordAudit(db, ctx, { action: 'UPDATE', entityType: 'project', entityId: projectId, metadata: { currentPhaseId: phaseId } });
  return row!;
}

export async function createTask(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createTaskSchema.parse(input);
  if (data.projectId) {
    await loadProject(db, ctx, data.projectId); // creación contextual (valida scope)
    await assertProjectNotClosed(db, ctx, data.projectId); // no crear tareas en un proyecto cerrado
  }
  if (data.opportunityId) {
    await assertRefInOrg(db, ctx, opportunities, data.opportunityId, 'opportunity'); // valida scope
    await assertOpportunityNotFrozen(db, ctx, data.opportunityId); // no crear tareas en una oportunidad archivada/cerrada
  }
  // Exclusión mutua Proyecto ↔ Oportunidad ↔ Personal (proyecto > oportunidad > personal), igual que updateTask:
  // fijar uno ANULA los otros. Antes solo se calculaba `personal`, pero se insertaban projectId Y opportunityId
  // tal cual → una tarea podía quedar ligada a proyecto Y oportunidad a la vez si el cliente enviaba ambos.
  let projectIdSet = data.projectId;
  let opportunityIdSet = data.opportunityId;
  let personal = data.personal ?? false;
  if (data.projectId) {
    personal = false;
    opportunityIdSet = undefined;
  } else if (data.opportunityId) {
    personal = false;
    projectIdSet = undefined;
  } else if (data.personal === true) {
    projectIdSet = undefined;
    opportunityIdSet = undefined;
  }
  try {
    const [row] = await db
      .insert(tasks)
      .values({
        organizationId: ctx.organizationId,
        projectId: projectIdSet,
        opportunityId: opportunityIdSet,
        parentTaskId: data.parentTaskId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId,
        personal,
        dueDate: data.dueDate?.toISOString().slice(0, 10),
      })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'task', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'task' });
  }
}

export async function updateTaskStatus(db: Database, ctx: OrgContext, id: string, status: TaskStatus) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), orgEq(tasks.organizationId, ctx)));
  if (!current) throw notFound('task');
  await assertProjectNotClosed(db, ctx, current.projectId); // congelar tareas de proyectos cerrados
  await assertOpportunityNotFrozen(db, ctx, current.opportunityId); // congelar tareas de oportunidades archivadas/cerradas
  assertTaskTransition(current.status as TaskStatus, status);
  const completedAt = status === 'DONE' ? (current.completedAt ?? new Date()) : null;
  // Atomicidad: UPDATE + change_event + recordAudit (encola write-back a Twenty) en una transacción.
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(tasks)
      .set({ status, completedAt, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), orgEq(tasks.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, { entityType: 'task', entityId: id, changeType: 'STATUS', previousState: { status: current.status }, newState: { status } });
    await recordAudit(tx, ctx, { action: status === 'DONE' ? 'COMPLETE' : 'UPDATE', entityType: 'task', entityId: id, metadata: { status } });
    return row!;
  });
}

export function completeTask(db: Database, ctx: OrgContext, id: string) {
  return updateTaskStatus(db, ctx, id, 'DONE');
}

export async function updateTask(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateTaskSchema.parse(input);
  const [current] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), orgEq(tasks.organizationId, ctx)));
  if (!current) throw notFound('task');
  await assertProjectNotClosed(db, ctx, current.projectId); // congelar tareas de proyectos cerrados
  await assertOpportunityNotFrozen(db, ctx, current.opportunityId); // congelar tareas de oportunidades archivadas/cerradas
  // Inmutabilidad por procedencia: si la task vino de Twenty, el título se edita en el origen.
  await assertNotEditingOwnedFields(db, ctx, 'task', id, data);
  if (data.projectId) {
    await loadProject(db, ctx, data.projectId); // valida scope al reasignar proyecto
    await assertProjectNotClosed(db, ctx, data.projectId); // no mover una tarea a un proyecto cerrado
  }
  if (data.opportunityId) {
    await assertRefInOrg(db, ctx, opportunities, data.opportunityId, 'opportunity'); // valida scope al reasignar
    await assertOpportunityNotFrozen(db, ctx, data.opportunityId); // no mover una tarea a una oportunidad archivada/cerrada
  }
  // Exclusión mutua Proyecto ↔ Oportunidad ↔ Personal: asignar uno anula los otros dos.
  // (drizzle omite las claves `undefined`, así que un PATCH parcial solo toca lo enviado.)
  let projectIdSet = data.projectId;
  let opportunityIdSet = data.opportunityId;
  let personalSet = data.personal;
  if (data.projectId) {
    personalSet = false;
    opportunityIdSet = null;
  } else if (data.opportunityId) {
    personalSet = false;
    projectIdSet = null;
  } else if (data.personal === true) {
    projectIdSet = null;
    opportunityIdSet = null;
  }
  const set = {
    title: data.title,
    description: data.description,
    priority: data.priority,
    dueDate: data.dueDate == null ? data.dueDate : data.dueDate.toISOString().slice(0, 10),
    projectId: projectIdSet,
    opportunityId: opportunityIdSet,
    personal: personalSet,
    updatedAt: new Date(),
  };
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(tasks)
        .set(set)
        .where(and(eq(tasks.id, id), orgEq(tasks.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo. `undefined` = campo no enviado en el PATCH → el helper lo ignora
      // (compara contra el valor previo, que no cambia).
      await recordFieldChanges(tx, ctx, {
        entityType: 'task',
        entityId: id,
        before: current,
        changed: Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined)),
      });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'task', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'task' });
  }
}

/**
 * Borra (definitivo) tareas/subtareas por id (acción de las listas: en tareas se borra, no se archiva).
 * Maneja las dependencias con seguridad, en una transacción:
 *  - Subtareas: la FK `tasks.parentTaskId → tasks.id` no tiene cascade → se borran primero las hijas de las
 *    tareas seleccionadas (un solo nivel: una subtarea no tiene sub-subtareas).
 *  - `external_identities` (mapeo con Twenty/Notion…): se borra el puntero para no dejar huérfanos que
 *    "escondan" la tarea del sync (el sync mira la identity y actualizaría 0 filas silenciosamente).
 *  - `outbox_events` pendientes de la tarea: se eliminan para que el worker no procese pushes de algo ya borrado.
 *  - Auditoría: `recordAudit(DELETE)` por tarea (el histórico `audit_logs` es inmutable, no se toca).
 * Idempotente respecto a ids inexistentes/de otra org (se ignoran). Requiere rol con permiso 'delete' (ADMIN+).
 */
export async function deleteTasks(db: Database, ctx: OrgContext, ids: string[]): Promise<{ deleted: number }> {
  requireCan(ctx.role, 'delete');
  if (ids.length === 0) return { deleted: 0 };
  try {
    return await db.transaction(async (tx) => {
      // Tareas seleccionadas que existen y son de esta org.
      const owned = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.id, ids)));
      const targetIds = owned.map((r) => r.id);
      if (targetIds.length === 0) return { deleted: 0 };
      // Subtareas (hijas) de las seleccionadas: hay que borrarlas antes por la FK parentTaskId.
      const children = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.parentTaskId, targetIds)));
      const childIds = children.map((r) => r.id).filter((cid) => !targetIds.includes(cid));
      const allIds = [...targetIds, ...childIds];
      // Limpiar punteros externos y outbox pendiente de todas las tareas a borrar.
      await tx
        .delete(externalIdentities)
        .where(and(orgEq(externalIdentities.organizationId, ctx), eq(externalIdentities.internalType, 'task'), inArray(externalIdentities.internalId, allIds)));
      await tx.delete(outboxEvents).where(and(eq(outboxEvents.aggregateType, 'task'), inArray(outboxEvents.aggregateId, allIds)));
      // Hijas primero, luego las seleccionadas.
      if (childIds.length > 0) {
        await tx.delete(tasks).where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.id, childIds)));
      }
      await tx.delete(tasks).where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.id, targetIds)));
      for (const tid of allIds) {
        await recordAudit(tx, ctx, { action: 'DELETE', entityType: 'task', entityId: tid });
      }
      return { deleted: allIds.length };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'task' });
  }
}

export async function createDeliverable(db: Database, ctx: OrgContext, projectId: string, input: unknown) {
  requireCan(ctx.role, 'write');
  await loadProject(db, ctx, projectId);
  const data = createDeliverableSchema.parse(input);
  try {
    const [row] = await db
      .insert(deliverables)
      .values({
        organizationId: ctx.organizationId,
        projectId,
        name: data.name,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate?.toISOString().slice(0, 10),
        externalUrl: data.externalUrl,
      })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'deliverable', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'deliverable' });
  }
}

export async function updateDeliverableStatus(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: DeliverableStatus,
) {
  requireCan(ctx.role, 'write');
  const [current] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, id), orgEq(deliverables.organizationId, ctx)));
  if (!current) throw notFound('deliverable');
  assertDeliverableTransition(current.status as DeliverableStatus, status);
  const completedAt = status === 'DELIVERED' ? (current.completedAt ?? new Date()) : current.completedAt;
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(deliverables)
      .set({ status, completedAt, updatedAt: new Date() })
      .where(and(eq(deliverables.id, id), orgEq(deliverables.organizationId, ctx)))
      .returning();
    // C-1: los cambios de estado de entregable también dejan rastro (antes no registraban nada).
    await recordChangeEvent(tx, ctx, {
      entityType: 'deliverable',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'deliverable', entityId: id, metadata: { status } });
    return row!;
  });
}

/**
 * Purga tareas COMPLETADAS (DONE) cuya `completed_at` es anterior a `retentionDays` (Fase 4 · retención).
 * El registro sobrevive en `audit_logs` (acción DELETE) → "conservar en los logs". No borra tareas que sean
 * padre de otra (evita romper la FK `parent_task_id`); esas se dejan y se documentan.
 *
 * Cada borrado va con su propio `try`: un impedimento en UNA tarea (una FK inesperada, un fallo puntual) no
 * puede tumbar el barrido entero con un error de servidor — se conserva esa fila, se cuenta en `blocked` y se
 * deja el motivo en el log.
 */
export async function purgeCompletedTasks(
  db: Database,
  ctx: OrgContext,
  opts: { retentionDays: number; now?: Date },
): Promise<{ deleted: number; skippedParents: number; blocked: number }> {
  requireCan(ctx.role, 'delete');
  if (!opts.retentionDays || opts.retentionDays <= 0) return { deleted: 0, skippedParents: 0, blocked: 0 };
  const cutoff = new Date((opts.now ?? new Date()).getTime() - opts.retentionDays * 86_400_000);

  const candidates = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(
      and(
        orgEq(tasks.organizationId, ctx),
        eq(tasks.status, 'DONE'),
        isNotNull(tasks.completedAt),
        lt(tasks.completedAt, cutoff),
      ),
    );
  if (candidates.length === 0) return { deleted: 0, skippedParents: 0, blocked: 0 };

  // No borrar tareas que sean padre de otra (romperían la self-FK).
  const parentRows = await db
    .select({ parentTaskId: tasks.parentTaskId })
    .from(tasks)
    .where(and(orgEq(tasks.organizationId, ctx), isNotNull(tasks.parentTaskId)));
  const parentIds = new Set(parentRows.map((r) => r.parentTaskId));

  let deleted = 0;
  let skippedParents = 0;
  let blocked = 0;
  for (const t of candidates) {
    if (parentIds.has(t.id)) {
      skippedParents++;
      continue;
    }
    try {
      await db.delete(tasks).where(and(eq(tasks.id, t.id), orgEq(tasks.organizationId, ctx)));
      await recordAudit(db, ctx, {
        action: 'DELETE',
        entityType: 'task',
        entityId: t.id,
        metadata: { reason: 'retention', title: t.title, retentionDays: opts.retentionDays },
      });
      deleted++;
    } catch (e) {
      blocked++;
      logger.warn('purga de tareas completadas: tarea conservada', {
        entityId: t.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { deleted, skippedParents, blocked };
}

export async function updateDeliverable(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updateDeliverableSchema.parse(input);
  const [current] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, id), orgEq(deliverables.organizationId, ctx)));
  if (!current) throw notFound('deliverable');
  const set = {
    name: data.name,
    description: data.description,
    dueDate: data.dueDate == null ? data.dueDate : data.dueDate.toISOString().slice(0, 10),
    externalUrl: data.externalUrl,
    updatedAt: new Date(),
  };
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(deliverables)
        .set(set)
        .where(and(eq(deliverables.id, id), orgEq(deliverables.organizationId, ctx)))
        .returning();
      // F-4: diff campo a campo (sólo lo enviado en el PATCH).
      await recordFieldChanges(tx, ctx, {
        entityType: 'deliverable',
        entityId: id,
        before: current,
        changed: Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined)),
      });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'deliverable', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'deliverable' });
  }
}


// --- A-3 (ADR-007): enlace N:M proyecto ↔ activo reutilizable ---

/** Verifica que el activo existe y es de la organización del contexto. */
async function loadAsset(db: Database, ctx: OrgContext, assetId: string) {
  const [row] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), orgEq(assets.organizationId, ctx)));
  if (!row) throw notFound('asset');
  return row;
}

/**
 * Enlaza un activo a un proyecto. **Idempotente**: enlazar dos veces el mismo par no falla (lo corta la UNIQUE y
 * se trata como éxito). El enlace es una REFERENCIA: no cambia la propiedad del activo (sigue en el catálogo).
 */
export async function linkProjectAsset(db: Database, ctx: OrgContext, projectId: string, assetId: string) {
  requireCan(ctx.role, 'write');
  await loadProject(db, ctx, projectId);
  await loadAsset(db, ctx, assetId);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projectAssets)
        .values({ projectId, assetId })
        .onConflictDoNothing({ target: [projectAssets.projectId, projectAssets.assetId] })
        .returning();
      await recordAudit(tx, ctx, {
        action: 'UPDATE',
        entityType: 'project',
        entityId: projectId,
        metadata: { linkedAsset: assetId },
      });
      return row ?? { projectId, assetId };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'project_asset' });
  }
}

/** Quita el enlace proyecto↔activo. NO borra el activo (sigue en el catálogo de la organización). */
export async function unlinkProjectAsset(db: Database, ctx: OrgContext, projectId: string, assetId: string) {
  requireCan(ctx.role, 'write');
  await loadProject(db, ctx, projectId);
  return await db.transaction(async (tx) => {
    await tx
      .delete(projectAssets)
      .where(and(eq(projectAssets.projectId, projectId), eq(projectAssets.assetId, assetId)));
    await recordAudit(tx, ctx, {
      action: 'UPDATE',
      entityType: 'project',
      entityId: projectId,
      metadata: { unlinkedAsset: assetId },
    });
    return { projectId, assetId };
  });
}
