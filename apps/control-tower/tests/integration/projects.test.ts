import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, eq, and } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createProject,
  updateProject,
  changeProjectStatus,
  createTask,
  updateTask,
  updateTaskStatus,
  completeTask,
  deleteTasks,
  createDeliverable,
  getProjectDetail,
  listProjects,
  listActiveTasks,
  listOverdueTasks,
  listCompletedTasks,
  createOpportunity,
  createProjectPhase,
  setCurrentPhase,
  deleteProjectPhase,
  createAsset,
  linkProjectAsset,
  unlinkProjectAsset,
  listProjectAssets,
  listAssetProjects,
  createClient,
  type OrgContext,
} from '@ct/application';

/** M06 — casos de uso del módulo Projects contra PostgreSQL real (aislados por transacción). */
const db = getDb();
const ROLLBACK = new Error('__rollback__');

async function inRollback(fn: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx as typeof db);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

async function makeOrg(tx: typeof db, role: OrgContext['role'] = 'OWNER'): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `p-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role });
  return { userId, organizationId, role };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});
/** Contexto del SYNC (actor SYSTEM), como lo invoca el worker: sólo el sistema crea oportunidades. */
const sync = (c: OrgContext): OrgContext => ({ ...c, userId: 'system' });


describe('projects use cases', () => {
  it('actualiza metadatos: nombre, prioridad, fecha objetivo y limpia una relación', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const [client] = await tx
        .insert(s.clients)
        .values({ organizationId: ctx.organizationId, name: 'Acme', slug: `c-${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE' })
        .returning();
      const p = await createProject(tx, ctx, { name: 'Sitio', clientId: client!.id });
      expect(p.clientId).toBe(client!.id);

      const updated = await updateProject(tx, ctx, p.id, {
        name: 'Sitio v2',
        priority: 'HIGH',
        targetDate: '2026-12-31',
        clientId: null, // limpiar la relación
      });
      expect(updated.name).toBe('Sitio v2');
      expect(updated.priority).toBe('HIGH');
      expect(updated.clientId).toBeNull();
      expect(String(updated.targetDate)).toContain('2026-12-31');

      // ref inválida → NOT_FOUND
      await expect(updateProject(tx, ctx, p.id, { serviceId: crypto.randomUUID() })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  it('crea proyecto con slug y transición de estado válida', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Sitio Web' });
      expect(p.slug).toBe('sitio-web');
      expect(p.status).toBe('PLANNED');
      const active = await changeProjectStatus(tx, ctx, p.id, 'ACTIVE');
      expect(active.status).toBe('ACTIVE');
      await expect(changeProjectStatus(tx, ctx, p.id, 'DELIVERED')).rejects.toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    });
  });

  it('creación contextual de task fija project_id y progreso se deriva', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const t1 = await createTask(tx, ctx, { title: 'T1', projectId: p.id });
      await createTask(tx, ctx, { title: 'T2', projectId: p.id });
      expect(t1.projectId).toBe(p.id);
      await completeTask(tx, ctx, t1.id);
      const detail = await getProjectDetail(tx, ctx, p.id);
      expect(detail.project.taskTotal).toBe(2);
      expect(detail.project.taskDone).toBe(1);
      expect(detail.project.progress).toBe(50);
    });
  });

  it('listCompletedTasks: incluye hechas y canceladas (con y sin proyecto), excluye activas y subtareas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      // Activa (no debe salir).
      await createTask(tx, ctx, { title: 'activa', projectId: p.id, status: 'IN_PROGRESS' });
      // Hecha con proyecto.
      const done1 = await createTask(tx, ctx, { title: 'hecha-proj', projectId: p.id });
      await updateTaskStatus(tx, ctx, done1.id, 'DONE');
      // Hecha SIN proyecto.
      const done2 = await createTask(tx, ctx, { title: 'hecha-suelta' });
      await updateTaskStatus(tx, ctx, done2.id, 'DONE');
      // Cancelada sin proyecto.
      const cancelled = await createTask(tx, ctx, { title: 'cancelada' });
      await updateTaskStatus(tx, ctx, cancelled.id, 'CANCELLED');
      // Subtarea hecha (no debe salir: es de nivel inferior).
      const sub = await createTask(tx, ctx, { title: 'subhecha', parentTaskId: done1.id });
      await updateTaskStatus(tx, ctx, sub.id, 'DONE');

      const list = await listCompletedTasks(tx, ctx);
      const titles = list.map((t) => t.title).sort();
      expect(titles).toEqual(['cancelada', 'hecha-proj', 'hecha-suelta']);
      const suelta = list.find((t) => t.title === 'hecha-suelta')!;
      expect(suelta.projectId ?? null).toBeNull();
      expect(suelta.completedAt).not.toBeNull();
      const canc = list.find((t) => t.title === 'cancelada')!;
      expect(canc.status).toBe('CANCELLED');
      expect(canc.completedAt ?? null).toBeNull(); // canceladas no setean completedAt
    });
  });

  it('Personal ↔ Proyecto son mutuamente excluyentes (create y update)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      // Crear personal.
      const t = await createTask(tx, ctx, { title: 'mía', personal: true });
      expect(t.personal).toBe(true);
      expect(t.projectId ?? null).toBeNull();
      // Asignar proyecto → deja de ser personal.
      const assigned = await updateTask(tx, ctx, t.id, { projectId: p.id });
      expect(assigned.projectId).toBe(p.id);
      expect(assigned.personal).toBe(false);
      // Marcar personal → se desasocia del proyecto.
      const back = await updateTask(tx, ctx, t.id, { personal: true });
      expect(back.personal).toBe(true);
      expect(back.projectId ?? null).toBeNull();
      // Crear con proyecto + personal:true a la vez → gana el proyecto (personal=false).
      const both = await createTask(tx, ctx, { title: 'ambas', projectId: p.id, personal: true });
      expect(both.projectId).toBe(p.id);
      expect(both.personal).toBe(false);
      // Crear con proyecto + oportunidad a la vez → gana el proyecto (opportunityId se anula).
      const opp = await createOpportunity(tx, sync(ctx), { name: 'O', stage: 'LEAD' });
      const projOpp = await createTask(tx, ctx, { title: 'proj+opp', projectId: p.id, opportunityId: opp.id });
      expect(projOpp.projectId).toBe(p.id);
      expect(projOpp.opportunityId ?? null).toBeNull();
    });
  });

  it('fases: crear autoasigna orden; fijar actual; borrar la fase actual la desmarca', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const f1 = await createProjectPhase(tx, ctx, p.id, { name: 'Descubrimiento' });
      const f2 = await createProjectPhase(tx, ctx, p.id, { name: 'Diseño' });
      expect(f1.sortOrder).toBe(0);
      expect(f2.sortOrder).toBe(1); // orden autoasignado (última + 1)

      const proj = await setCurrentPhase(tx, ctx, p.id, f2.id);
      expect(proj.currentPhaseId).toBe(f2.id);

      // Borrar la fase que es la actual → el proyecto queda sin fase actual (sin puntero colgado).
      await deleteProjectPhase(tx, ctx, f2.id);
      const [after] = await tx.select({ currentPhaseId: s.projects.currentPhaseId }).from(s.projects).where(eq(s.projects.id, p.id));
      expect(after!.currentPhaseId ?? null).toBeNull();
    });
  });

  it('un proyecto CERRADO congela su estado y sus tareas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P', status: 'ACTIVE' });
      const t = await createTask(tx, ctx, { title: 't', projectId: p.id, status: 'IN_PROGRESS' });
      await updateTaskStatus(tx, ctx, t.id, 'DONE'); // requisito para cerrar
      await changeProjectStatus(tx, ctx, p.id, 'CLOSED');
      // El estado del proyecto cerrado no cambia (transición inválida).
      await expect(changeProjectStatus(tx, ctx, p.id, 'ACTIVE')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
      await expect(changeProjectStatus(tx, ctx, p.id, 'ARCHIVED')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
      // Sus tareas quedan de solo lectura: ni fecha ni estado.
      await expect(updateTask(tx, ctx, t.id, { dueDate: new Date('2030-01-01') })).rejects.toMatchObject({ code: 'PROJECT_CLOSED' });
      await expect(updateTaskStatus(tx, ctx, t.id, 'IN_PROGRESS')).rejects.toMatchObject({ code: 'PROJECT_CLOSED' });
      // No se pueden crear tareas nuevas en un proyecto cerrado.
      await expect(createTask(tx, ctx, { title: 'nueva', projectId: p.id })).rejects.toMatchObject({ code: 'PROJECT_CLOSED' });
    });
  });

  it('crear task a nivel global (sin proyecto) y reasignarla/desasociarla luego', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      // Task nativa de CT sin proyecto (lo que hace POST /api/v1/tasks desde la vista de tareas).
      const t = await createTask(tx, ctx, { title: 'Suelta' });
      expect(t.projectId ?? null).toBeNull();
      // Asociar a un proyecto vía updateTask.
      const p = await createProject(tx, ctx, { name: 'Destino' });
      const assigned = await updateTask(tx, ctx, t.id, { projectId: p.id });
      expect(assigned.projectId).toBe(p.id);
      // Desasociar (projectId = null).
      const detached = await updateTask(tx, ctx, t.id, { projectId: null });
      expect(detached.projectId ?? null).toBeNull();
    });
  });

  it('reasignar a un proyecto de otra organización se rechaza (scope)', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      const t = await createTask(tx, a, { title: 'Suelta' });
      const projB = await createProject(tx, b, { name: 'Ajena' });
      await expect(updateTask(tx, a, t.id, { projectId: projB.id })).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });
  });

  it('invariante: no se puede cerrar un proyecto con tasks activas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P', status: 'ACTIVE' });
      await createTask(tx, ctx, { title: 'pendiente', projectId: p.id, status: 'IN_PROGRESS' });
      await expect(changeProjectStatus(tx, ctx, p.id, 'CLOSED')).rejects.toMatchObject({
        code: 'PROJECT_HAS_ACTIVE_TASKS',
      });
    });
  });

  it('cerrar es posible cuando todas las tasks están DONE/CANCELLED', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P', status: 'ACTIVE' });
      const t = await createTask(tx, ctx, { title: 't', projectId: p.id, status: 'IN_PROGRESS' });
      await updateTaskStatus(tx, ctx, t.id, 'DONE');
      const closed = await changeProjectStatus(tx, ctx, p.id, 'CLOSED');
      expect(closed.status).toBe('CLOSED');
      expect(closed.completedAt).not.toBeNull();
    });
  });

  it('deriva health AT_RISK con target_date vencido', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createProject(tx, ctx, { name: 'Vencido', status: 'ACTIVE', targetDate: '2000-01-01' as unknown as Date });
      const list = await listProjects(tx, ctx);
      expect(list[0]!.health).toBe('AT_RISK');
    });
  });

  it('rechaza task con projectId de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      const pB = await createProject(tx, b, { name: 'B proj' });
      await expect(createTask(tx, a, { title: 'x', projectId: pB.id })).rejects.toMatchObject({
        kind: 'NOT_FOUND',
      });
    });
  });

  it('deleteTasks: borra la tarea y sus subtareas (cascade), respeta scope y limpia identities', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const other = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const t1 = await createTask(tx, ctx, { title: 'T1', projectId: p.id });
      await createTask(tx, ctx, { title: 'S1', parentTaskId: t1.id }); // subtarea de T1
      const t2 = await createTask(tx, ctx, { title: 'T2', projectId: p.id });
      // Identity externa colgando de T1 (simula import de Twenty): debe limpiarse al borrar.
      await tx.insert(s.externalIdentities).values({
        organizationId: ctx.organizationId,
        provider: 'TWENTY',
        externalType: 'task',
        externalId: `ext-${crypto.randomUUID().slice(0, 8)}`,
        internalType: 'task',
        internalId: t1.id,
      });

      // Otra org no puede borrar tareas ajenas (scope) → 0.
      expect((await deleteTasks(tx, other, [t1.id])).deleted).toBe(0);

      // Borrar T1 → borra T1 + su subtarea (FK parentTaskId sin cascade se maneja en el comando). T2 permanece.
      const res = await deleteTasks(tx, ctx, [t1.id]);
      expect(res.deleted).toBe(2);
      const remaining = await tx.select({ id: s.tasks.id }).from(s.tasks).where(eq(s.tasks.organizationId, ctx.organizationId));
      expect(remaining.map((r) => r.id)).toEqual([t2.id]);
      // La identity externa de T1 se limpió (no queda huérfana que "esconda" la tarea del sync).
      const ids = await tx.select().from(s.externalIdentities).where(eq(s.externalIdentities.internalId, t1.id));
      expect(ids.length).toBe(0);
      // Auditoría DELETE registrada (una por tarea borrada).
      const audits = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.organizationId, ctx.organizationId), eq(s.auditLogs.action, 'DELETE')));
      expect(audits.length).toBe(2);
    });
  });

  it('vista global y overdue excluyen tareas de proyectos cerrados/archivados (no las personales)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const pActive = await createProject(tx, ctx, { name: 'Activo', status: 'ACTIVE' });
      const pArch = await createProject(tx, ctx, { name: 'AArchivar', status: 'ACTIVE' });
      // Tareas activas con fecha pasada (vencidas) en ambos proyectos + una personal.
      await createTask(tx, ctx, { title: 'visible', projectId: pActive.id, status: 'IN_PROGRESS', dueDate: new Date('2000-01-01') });
      await createTask(tx, ctx, { title: 'oculta', projectId: pArch.id, status: 'IN_PROGRESS', dueDate: new Date('2000-01-01') });
      await createTask(tx, ctx, { title: 'personal', personal: true, status: 'IN_PROGRESS', dueDate: new Date('2000-01-01') });
      // Archivar el segundo proyecto (ARCHIVED admite tareas activas; CLOSED no, por invariante).
      await changeProjectStatus(tx, ctx, pArch.id, 'ARCHIVED');

      const active = await listActiveTasks(tx, ctx);
      expect(active.map((t) => t.title).sort()).toEqual(['personal', 'visible']);
      const overdue = await listOverdueTasks(tx, ctx, '2020-01-01');
      expect(overdue.map((t) => t.title).sort()).toEqual(['personal', 'visible']);
    });
  });

  it('crear deliverable en proyecto y transición de estado', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const d = await createDeliverable(tx, ctx, p.id, { name: 'Entrega' });
      expect(d.status).toBe('PLANNED');
      expect(d.projectId).toBe(p.id);
    });
  });

  // --- A-1 (ADR-005): tipo de proyecto + invariante "CLIENT exige cliente" ---
  it('A-1: el tipo por defecto es INTERNAL y CLIENT sin cliente se rechaza (crear y editar)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Sin tipo' });
      expect(p.type).toBe('INTERNAL');

      await expect(createProject(tx, ctx, { name: 'Huérfano', type: 'CLIENT' })).rejects.toMatchObject({
        code: 'PROJECT_CLIENT_REQUIRED',
      });
      // Pasar a CLIENT un proyecto sin cliente tampoco vale…
      await expect(updateProject(tx, ctx, p.id, { type: 'CLIENT' })).rejects.toMatchObject({
        code: 'PROJECT_CLIENT_REQUIRED',
      });

      const c = await createClient(tx, ctx, { name: 'Cliente A' });
      // …pero sí si el mismo PATCH trae el cliente.
      const upd = await updateProject(tx, ctx, p.id, { type: 'CLIENT', clientId: c.id });
      expect(upd.type).toBe('CLIENT');
      // Y quitarle el cliente a un CLIENT vuelve a romper el invariante.
      await expect(updateProject(tx, ctx, p.id, { clientId: null })).rejects.toMatchObject({
        code: 'PROJECT_CLIENT_REQUIRED',
      });
    });
  });

  it('A-1: un proyecto personal se fuerza a INTERNAL', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const c = await createClient(tx, ctx, { name: 'Cliente B' });
      const p = await createProject(tx, ctx, { name: 'Mío', type: 'CLIENT', clientId: c.id });
      expect(p.type).toBe('CLIENT');
      const upd = await updateProject(tx, ctx, p.id, { personal: true });
      expect(upd.type).toBe('INTERNAL');
      expect(upd.clientId).toBeNull();
    });
  });

  // --- A-3 (ADR-007): enlace N:M proyecto ↔ activo reutilizable ---
  it('A-3: enlazar/desenlazar activos es idempotente y no borra el activo', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p1 = await createProject(tx, ctx, { name: 'P1' });
      const p2 = await createProject(tx, ctx, { name: 'P2' });
      const a = await createAsset(tx, ctx, { name: 'Plantilla', assetType: 'TEMPLATE' });

      await linkProjectAsset(tx, ctx, p1.id, a.id);
      await linkProjectAsset(tx, ctx, p1.id, a.id); // idempotente: no lanza ni duplica
      await linkProjectAsset(tx, ctx, p2.id, a.id); // el mismo activo, reutilizado en otro proyecto

      expect((await listProjectAssets(tx, ctx, p1.id)).map((x) => x.name)).toEqual(['Plantilla']);
      expect((await listAssetProjects(tx, ctx, a.id)).map((x) => x.name).sort()).toEqual(['P1', 'P2']);

      await unlinkProjectAsset(tx, ctx, p1.id, a.id);
      expect(await listProjectAssets(tx, ctx, p1.id)).toEqual([]);
      // el activo sigue en el catálogo y en el otro proyecto
      expect((await listAssetProjects(tx, ctx, a.id)).map((x) => x.name)).toEqual(['P2']);
    });
  });

  it('A-3: no se puede enlazar un activo de otra organización', async () => {
    await inRollback(async (tx) => {
      const ctxA = await makeOrg(tx);
      const ctxB = await makeOrg(tx);
      const p = await createProject(tx, ctxA, { name: 'P' });
      const ajeno = await createAsset(tx, ctxB, { name: 'Ajeno', assetType: 'TEMPLATE' });
      await expect(linkProjectAsset(tx, ctxA, p.id, ajeno.id)).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });
  });
});
