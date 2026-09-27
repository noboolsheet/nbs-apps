import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { isExternallyArchived } from '@ct/domain';
import {
  ARCHIVABLE,
  archiveRecords,
  restoreRecords,
  listArchived,
  archiveTerminalRecords,
  purgeArchivedByIds,
  purgeArchivedRecords,
  purgeReviewedItems,
  createClient,
  createContact,
  createOpportunity,
  createProject,
  createTask,
  createDeliverable,
  createResource,
  createStrategicArea,
  createGoal,
  createCapability,
  createService,
  createDecision,
  createKnowledgeItem,
  createDocument,
  createAsset,
  createPortfolioItem,
  createLearningItem,
  createPayment,
  createReviewItem,
  updateReviewItemStatus,
  promoteReviewItemToKnowledge,
  type OrgContext,
} from '@ct/application';

/**
 * Retención · purga de archivados. El caso que motiva estos tests: `purgeArchivedRecords` se saltaba en SILENCIO
 * todo lo que una FK bloqueaba, y su orden hijo→padre estaba incompleto — proyectos, clientes, reutilizables,
 * pagos y «por revisar» archivados NO se borraban nunca por mucho que se pulsara «Purgar ahora».
 *
 * No usa `inRollback`: la purga captura errores de FK por fila, y dentro de una transacción un error deja la
 * transacción abortada. Cada test crea su propia organización y la borra al final.
 */
const db = getDb();

/** Crea una organización aislada para el test. */
async function makeOrg(): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `ret-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await db.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await db.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

/** Borra todo rastro de la organización del test (incluidas las tablas hijas no archivables). */
async function dropOrg(ctx: OrgContext) {
  const org = ctx.organizationId;
  await db.execute(sql`delete from notes where organization_id = ${org}`);
  await db.execute(sql`delete from change_events where organization_id = ${org}`);
  await db.execute(sql`delete from audit_logs where organization_id = ${org}`);
  await db.execute(sql`delete from outbox_events where organization_id = ${org}`);
  await db.execute(sql`delete from project_assets where project_id in (select id from projects where organization_id = ${org})`);
  await db.execute(sql`update projects set current_phase_id = null where organization_id = ${org}`);
  await db.execute(sql`delete from project_phases where project_id in (select id from projects where organization_id = ${org})`);
  await db.execute(sql`delete from service_capabilities where service_id in (select id from services where organization_id = ${org})`);
  for (const type of [
    'task', 'deliverable', 'decision', 'resource', 'portfolio_item', 'document', 'review_item', 'payment',
    'project', 'opportunity', 'contact', 'goal', 'knowledge_item', 'asset', 'learning_item', 'capability',
    'service', 'client', 'strategic_area',
  ]) {
    const meta = ARCHIVABLE[type]!;
    const c = meta.table as unknown as { organizationId: never };
    await db.delete(meta.table).where(eq(c.organizationId, org));
  }
  await db.delete(s.organizationMembers).where(eq(s.organizationMembers.organizationId, org));
  await db.delete(s.users).where(eq(s.users.id, ctx.userId));
  await db.delete(s.organizations).where(eq(s.organizations.id, org));
}

/** Una fila de CADA entidad archivable, con sus relaciones reales (el grafo completo de FKs). */
async function seedEverything(ctx: OrgContext): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  const cl = await createClient(db, ctx, { name: 'Cliente' });
  ids.client = cl.id;
  ids.contact = (await createContact(db, ctx, { email: `c-${cl.id.slice(0, 8)}@ex.com`, clientId: cl.id })).id;
  ids.opportunity = (await createOpportunity(db, sync(ctx), { name: 'Oportunidad', clientId: cl.id })).id;
  const pr = await createProject(db, ctx, { name: 'Proyecto', clientId: cl.id, type: 'CLIENT' });
  ids.project = pr.id;
  ids.task = (await createTask(db, ctx, { title: 'Tarea', projectId: pr.id })).id;
  ids.deliverable = (await createDeliverable(db, ctx, pr.id, { name: 'Entregable' })).id;
  ids.resource = (await createResource(db, ctx, { name: 'Recurso', clientId: cl.id, type: 'Hosting' })).id;
  const area = await createStrategicArea(db, ctx, { name: 'Área' });
  ids.strategic_area = area.id;
  ids.goal = (await createGoal(db, ctx, { name: 'Objetivo', strategicAreaId: area.id })).id;
  ids.capability = (await createCapability(db, ctx, { name: 'Capacidad' })).id;
  ids.service = (await createService(db, ctx, { name: 'Servicio' })).id;
  ids.decision = (await createDecision(db, ctx, { title: 'Decisión', decision: 'Hacerlo' })).id;
  ids.knowledge_item = (await createKnowledgeItem(db, ctx, { title: 'Conocimiento' })).id;
  ids.document = (await createDocument(db, ctx, { name: 'Documento', projectId: pr.id })).id;
  const asset = await createAsset(db, ctx, { name: 'Reutilizable', assetType: 'Plantilla' });
  ids.asset = asset.id;
  ids.portfolio_item = (await createPortfolioItem(db, ctx, { name: 'Portafolio' })).id;
  ids.learning_item = (await createLearningItem(db, ctx, { title: 'Aprendizaje', kind: 'Curso' })).id;
  ids.payment = (await createPayment(db, ctx, { concept: 'Pago', direction: 'IN', amount: '100', clientId: cl.id })).id;
  ids.review_item = (await createReviewItem(db, ctx, { title: 'Por revisar' })).id;

  // Hijas NO archivables que cuelgan del proyecto/servicio: son las que bloqueaban el borrado del padre.
  const [phase] = await db
    .insert(s.projectPhases)
    .values({ organizationId: ctx.organizationId, projectId: pr.id, name: 'Fase', sortOrder: 1, status: 'ACTIVE' })
    .returning();
  await db.update(s.projects).set({ currentPhaseId: phase!.id }).where(eq(s.projects.id, pr.id));
  await db.insert(s.projectAssets).values({ projectId: pr.id, assetId: asset.id });
  await db.insert(s.serviceCapabilities).values({ serviceId: ids.service, capabilityId: ids.capability });
  return ids;
}

/** Archiva todo lo creado y envejece la marca de archivado para que caiga fuera de la retención. */
async function archiveAndAge(ctx: OrgContext, ids: Record<string, string>, days = 400) {
  for (const [type, id] of Object.entries(ids)) {
    if (isExternallyArchived(type)) {
      // Cliente, contacto y oportunidad ya no se archivan a mano (owner 2026-09-27): los archiva la reconciliación
      // del sync, que escribe la columna directamente. Aquí se imita eso, porque la purga sí tiene que cubrirlos.
      const meta = ARCHIVABLE[type]!;
      const c = meta.table as unknown as { id: never };
      await db.update(meta.table).set({ archivedAt: new Date() } as never).where(eq(c.id, id as never));
      continue;
    }
    await archiveRecords(db, ctx, { entityType: type, ids: [id] });
  }
  const aged = new Date(Date.now() - days * 86_400_000);
  for (const type of Object.keys(ids)) {
    const meta = ARCHIVABLE[type]!;
    const c = meta.table as unknown as { organizationId: never };
    await db
      .update(meta.table)
      .set({ archivedAt: aged } as never)
      .where(eq(c.organizationId, ctx.organizationId));
  }
}

/** Cuántas filas quedan por entidad. */
async function remaining(ctx: OrgContext): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const [type, meta] of Object.entries(ARCHIVABLE)) {
    const c = meta.table as unknown as { id: never; organizationId: never };
    const rows = await db.select({ id: c.id }).from(meta.table).where(eq(c.organizationId, ctx.organizationId));
    if (rows.length) out[type] = rows.length;
  }
  return out;
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});
/** Contexto del SYNC (actor SYSTEM), como lo invoca el worker: sólo el sistema crea oportunidades. */
const sync = (c: OrgContext): OrgContext => ({ ...c, userId: 'system' });


describe('purga de archivados', () => {
  it('borra TODAS las entidades archivables, incluidas las que bloqueaban FKs (proyecto, cliente, pago, por revisar)', async () => {
    const ctx = await makeOrg();
    try {
      const ids = await seedEverything(ctx);
      await archiveAndAge(ctx, ids);

      const res = await purgeArchivedRecords(db, ctx, { retentionDays: 30 });

      expect(res.blocked).toEqual({});
      expect(res.skipped).toBe(0);
      expect(res.deleted).toBe(Object.keys(ids).length);
      expect(await remaining(ctx)).toEqual({});
    } finally {
      await dropOrg(ctx);
    }
  });

  it('conserva (y REPORTA) lo que un registro vivo aún referencia, sin lanzar error', async () => {
    const ctx = await makeOrg();
    try {
      const cl = await createClient(db, ctx, { name: 'Cliente con proyecto vivo' });
      // El proyecto NO se archiva: mantiene viva la FK hacia el cliente archivado.
      await createProject(db, ctx, { name: 'Proyecto vivo', clientId: cl.id, type: 'CLIENT' });
      await archiveAndAge(ctx, { client: cl.id });

      const res = await purgeArchivedRecords(db, ctx, { retentionDays: 30 });

      expect(res.deleted).toBe(0);
      expect(res.blocked).toEqual({ client: 1 });
      expect(res.skipped).toBe(1);
    } finally {
      await dropOrg(ctx);
    }
  });

  it('sin política de retención no borra nada', async () => {
    const ctx = await makeOrg();
    try {
      const cl = await createClient(db, ctx, { name: 'Cliente' });
      await archiveAndAge(ctx, { client: cl.id });
      expect(await purgeArchivedRecords(db, ctx, { retentionDays: 0 })).toEqual({ deleted: 0, skipped: 0, blocked: {} });
      expect((await remaining(ctx)).client).toBe(1);
    } finally {
      await dropOrg(ctx);
    }
  });
});

/** Envejece un recurso de la cola para que caiga fuera de cualquier plazo de retención. */
async function ageReviewItem(id: string) {
  const aged = new Date(Date.now() - 400 * 86_400_000);
  await db.update(s.reviewItems).set({ reviewedAt: aged, updatedAt: aged }).where(eq(s.reviewItems.id, id));
}

describe('purga de «Por revisar»', () => {
  /**
   * La regla que motiva estos tests (petición del owner, 2026-09-01): un recurso REVISADO que **no** se ha
   * pasado a la biblioteca es la única copia que queda de él —título, enlace y notas viven ahí y en ningún
   * otro sitio—, así que la retención NO puede borrarlo. Antes sí lo hacía: era pérdida de información.
   */
  it('NO borra un revisado que todavía no está en la biblioteca, por viejo que sea', async () => {
    const ctx = await makeOrg();
    try {
      const revisado = await createReviewItem(db, ctx, { title: 'Revisado sin procesar' });
      await updateReviewItemStatus(db, ctx, revisado.id, 'REVIEWED');
      await ageReviewItem(revisado.id);

      expect(await purgeReviewedItems(db, ctx, { retentionDays: 30 })).toEqual({ deleted: 0 });
      const left = await db
        .select({ id: s.reviewItems.id })
        .from(s.reviewItems)
        .where(eq(s.reviewItems.organizationId, ctx.organizationId));
      expect(left.map((r) => r.id)).toEqual([revisado.id]);
    } finally {
      await dropOrg(ctx);
    }
  });

  it('borra el revisado que YA está en la biblioteca (no se pierde nada: sigue allí)', async () => {
    const ctx = await makeOrg();
    try {
      const pendiente = await createReviewItem(db, ctx, { title: 'Sin revisar' });
      const revisado = await createReviewItem(db, ctx, { title: 'Revisado y procesado' });
      await updateReviewItemStatus(db, ctx, revisado.id, 'REVIEWED');
      const ki = await promoteReviewItemToKnowledge(db, ctx, revisado.id);
      await ageReviewItem(revisado.id);

      expect(await purgeReviewedItems(db, ctx, { retentionDays: 30 })).toEqual({ deleted: 1 });
      const left = await db
        .select({ id: s.reviewItems.id })
        .from(s.reviewItems)
        .where(eq(s.reviewItems.organizationId, ctx.organizationId));
      expect(left.map((r) => r.id)).toEqual([pendiente.id]);
      // Lo importante: la información NO se perdió, sigue en la biblioteca.
      const survivor = await db
        .select({ id: s.knowledgeItems.id })
        .from(s.knowledgeItems)
        .where(eq(s.knowledgeItems.id, ki.id));
      expect(survivor).toHaveLength(1);
    } finally {
      await dropOrg(ctx);
    }
  });

  it('borra los descartados fuera de plazo (descartar no guarda nada que preservar)', async () => {
    const ctx = await makeOrg();
    try {
      const descartado = await createReviewItem(db, ctx, { title: 'No me interesa' });
      await updateReviewItemStatus(db, ctx, descartado.id, 'DISCARDED');
      await ageReviewItem(descartado.id);

      expect(await purgeReviewedItems(db, ctx, { retentionDays: 30 })).toEqual({ deleted: 1 });
    } finally {
      await dropOrg(ctx);
    }
  });

  it('conserva los pendientes aunque sean antiguos', async () => {
    const ctx = await makeOrg();
    try {
      const pendiente = await createReviewItem(db, ctx, { title: 'Sin revisar' });
      await ageReviewItem(pendiente.id);
      expect(await purgeReviewedItems(db, ctx, { retentionDays: 30 })).toEqual({ deleted: 0 });
    } finally {
      await dropOrg(ctx);
    }
  });

  it('sin política de retención conserva todo', async () => {
    const ctx = await makeOrg();
    try {
      const item = await createReviewItem(db, ctx, { title: 'Revisado' });
      await updateReviewItemStatus(db, ctx, item.id, 'REVIEWED');
      expect(await purgeReviewedItems(db, ctx, { retentionDays: 0 })).toEqual({ deleted: 0 });
    } finally {
      await dropOrg(ctx);
    }
  });
});

/**
 * **Archivado: un solo mecanismo** (owner 2026-09-27). Lo que se comprueba aquí es justo lo que estaba roto:
 * el archivado no arrastraba a los hijos (y por eso la purga del padre no avanzaba nunca), no existía forma de
 * borrar un archivado concreto, y nada archivaba lo que llevaba semanas cerrado.
 */
describe('archivado en cascada', () => {
  it('archivar un proyecto se lleva sus tareas y sus entregables', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto con hijos' });
      const tarea = await createTask(db, ctx, { title: 'Tarea', projectId: pr.id });
      const ent = await createDeliverable(db, ctx, pr.id, { name: 'Entregable' });

      expect(await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] })).toBe(1);

      const [t] = await db.select().from(s.tasks).where(eq(s.tasks.id, tarea.id));
      const [d] = await db.select().from(s.deliverables).where(eq(s.deliverables.id, ent.id));
      expect(t!.archivedAt).not.toBeNull();
      expect(d!.archivedAt).not.toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('restaurar devuelve los hijos que se archivaron CON él, y sólo esos', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto' });
      const propia = await createTask(db, ctx, { title: 'Archivada aparte', projectId: pr.id });
      const conElPadre = await createTask(db, ctx, { title: 'Archivada con el proyecto', projectId: pr.id });

      // Una tarea archivada ANTES, por su cuenta: no debe revivir al restaurar el proyecto.
      await archiveRecords(db, ctx, { entityType: 'task', ids: [propia.id] });
      await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] });
      await restoreRecords(db, ctx, { entityType: 'project', ids: [pr.id] });

      const [a] = await db.select().from(s.tasks).where(eq(s.tasks.id, propia.id));
      const [b] = await db.select().from(s.tasks).where(eq(s.tasks.id, conElPadre.id));
      expect(a!.archivedAt, 'la que se archivó aparte sigue archivada').not.toBeNull();
      expect(b!.archivedAt, 'la que fue con el proyecto vuelve').toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('gracias a la cascada, la purga del proyecto ya avanza (antes se bloqueaba para siempre)', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto a purgar' });
      await createTask(db, ctx, { title: 'Tarea', projectId: pr.id });
      await createDeliverable(db, ctx, pr.id, { name: 'Entregable' });
      await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] });
      await db.execute(sql`update projects set archived_at = now() - interval '30 days' where id = ${pr.id}`);
      await db.execute(sql`update tasks set archived_at = now() - interval '30 days' where project_id = ${pr.id}`);
      await db.execute(sql`update deliverables set archived_at = now() - interval '30 days' where project_id = ${pr.id}`);

      const res = await purgeArchivedRecords(db, ctx, { retentionDays: 1 });
      expect(res.skipped).toBe(0);
      expect(await remaining(ctx)).toEqual({});
    } finally {
      await dropOrg(ctx);
    }
  });
});

describe('el CRM se archiva en el origen', () => {
  it('cliente, contacto y oportunidad no se pueden archivar ni restaurar a mano', async () => {
    const ctx = await makeOrg();
    try {
      const cl = await createClient(db, ctx, { name: 'Cliente de Twenty' });
      const co = await createContact(db, ctx, { email: 'x@ex.com', clientId: cl.id });
      const op = await createOpportunity(db, sync(ctx), { name: 'Oportunidad', clientId: cl.id });
      for (const [entityType, id] of [['client', cl.id], ['contact', co.id], ['opportunity', op.id]] as const) {
        await expect(archiveRecords(db, ctx, { entityType, ids: [id] })).rejects.toThrow(/en el origen/);
        await expect(restoreRecords(db, ctx, { entityType, ids: [id] })).rejects.toThrow(/en el origen/);
      }
      // Y siguen vivos: el rechazo es antes de tocar nada.
      const [row] = await db.select().from(s.clients).where(eq(s.clients.id, cl.id));
      expect(row!.archivedAt).toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('`listArchived` los marca como no restaurables y dice por qué están archivados', async () => {
    const ctx = await makeOrg();
    try {
      const cl = await createClient(db, ctx, { name: 'Desaparecido de Twenty' });
      const pr = await createProject(db, ctx, { name: 'Proyecto archivado a mano' });
      // Como lo deja la reconciliación del sync.
      await db.update(s.clients).set({ archivedAt: new Date() }).where(eq(s.clients.id, cl.id));
      await db.insert(s.auditLogs).values({
        organizationId: ctx.organizationId,
        actorType: 'SYSTEM',
        action: 'ARCHIVE',
        entityType: 'client',
        entityId: cl.id,
        metadata: { reason: 'sync-missing' },
      });
      await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] });

      const groups = await listArchived(db, ctx);
      const clientes = groups.find((g) => g.entityType === 'client');
      const proyectos = groups.find((g) => g.entityType === 'project');
      expect(clientes?.restorable).toBe(false);
      expect(clientes?.items[0]?.reason).toBe('sync-missing');
      expect(proyectos?.restorable).toBe(true);
      // El archivado a mano no escribe motivo: la pantalla lo muestra como «Archivado a mano».
      expect(proyectos?.items[0]?.reason).toBe('manual');
    } finally {
      await dropOrg(ctx);
    }
  });
});

describe('borrado definitivo por selección', () => {
  it('borra lo archivado, ignora lo vivo y avisa de lo que algo vivo aún usa', async () => {
    const ctx = await makeOrg();
    try {
      const archivado = await createKnowledgeItem(db, ctx, { title: 'Archivado' });
      const vivo = await createKnowledgeItem(db, ctx, { title: 'Vivo' });
      await archiveRecords(db, ctx, { entityType: 'knowledge_item', ids: [archivado.id] });

      const res = await purgeArchivedByIds(db, ctx, {
        entityType: 'knowledge_item',
        ids: [archivado.id, vivo.id],
      });
      expect(res).toEqual({ deleted: 1, blocked: 0, skipped: 1 });

      const quedan = await db
        .select({ id: s.knowledgeItems.id })
        .from(s.knowledgeItems)
        .where(eq(s.knowledgeItems.organizationId, ctx.organizationId));
      expect(quedan.map((r) => r.id)).toEqual([vivo.id]);
    } finally {
      await dropOrg(ctx);
    }
  });

  it('arrastra a los hijos archivados (si no, su FK bloqueaba al padre y no se borraba nunca)', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto con hijos' });
      const tarea = await createTask(db, ctx, { title: 'Tarea', projectId: pr.id });
      const sub = await createTask(db, ctx, { title: 'Subtarea', projectId: pr.id, parentTaskId: tarea.id });
      await createDeliverable(db, ctx, pr.id, { name: 'Entregable' });
      await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] });

      // Proyecto + tarea + subtarea + entregable = 4.
      expect(await purgeArchivedByIds(db, ctx, { entityType: 'project', ids: [pr.id] })).toEqual({
        deleted: 4,
        blocked: 0,
        skipped: 0,
      });
      expect(await remaining(ctx)).toEqual({});
      expect(sub.id).toBeTruthy();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('conserva —y lo dice— lo que una fila viva sigue referenciando', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto' });
      const doc = await createDocument(db, ctx, { name: 'Documento vivo', projectId: pr.id });
      // El proyecto se archiva (y arrastra tareas/entregables), pero el DOCUMENTO no es hijo de la cascada.
      await archiveRecords(db, ctx, { entityType: 'project', ids: [pr.id] });

      const res = await purgeArchivedByIds(db, ctx, { entityType: 'project', ids: [pr.id] });
      expect(res).toEqual({ deleted: 0, blocked: 1, skipped: 0 });

      // Archivando también el documento, el proyecto ya se puede borrar.
      await archiveRecords(db, ctx, { entityType: 'document', ids: [doc.id] });
      await purgeArchivedByIds(db, ctx, { entityType: 'document', ids: [doc.id] });
      expect(await purgeArchivedByIds(db, ctx, { entityType: 'project', ids: [pr.id] })).toEqual({
        deleted: 1,
        blocked: 0,
        skipped: 0,
      });
    } finally {
      await dropOrg(ctx);
    }
  });
});

describe('autoarchivado por estado terminal', () => {
  /** Envejece `updated_at`, que es la edad que mira el barrido. */
  async function ageUpdated(table: string, id: string, days: number) {
    await db.execute(sql.raw(`update ${table} set updated_at = now() - interval '${days} days' where id = '${id}'`));
  }

  it('archiva lo cerrado hace más de una semana y deja en paz lo reciente', async () => {
    const ctx = await makeOrg();
    try {
      const viejo = await createProject(db, ctx, { name: 'Cerrado hace tiempo' });
      const reciente = await createProject(db, ctx, { name: 'Cerrado ayer' });
      await db.update(s.projects).set({ status: 'CLOSED' }).where(eq(s.projects.id, viejo.id));
      await db.update(s.projects).set({ status: 'CLOSED' }).where(eq(s.projects.id, reciente.id));
      await ageUpdated('projects', viejo.id, 30);
      await ageUpdated('projects', reciente.id, 1);

      const res = await archiveTerminalRecords(db, ctx, {});
      expect(res.byEntity.project).toBe(1);

      const [v] = await db.select().from(s.projects).where(eq(s.projects.id, viejo.id));
      const [r] = await db.select().from(s.projects).where(eq(s.projects.id, reciente.id));
      expect(v!.archivedAt).not.toBeNull();
      expect(r!.archivedAt).toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('recoge lo que quedó con el viejo estado «Archivado», que no archivaba nada', async () => {
    const ctx = await makeOrg();
    try {
      const dec = await createDecision(db, ctx, { title: 'Decisión', decision: 'Algo' });
      await db.update(s.decisions).set({ status: 'ARCHIVED' }).where(eq(s.decisions.id, dec.id));
      await ageUpdated('decisions', dec.id, 30);

      expect((await archiveTerminalRecords(db, ctx, {})).byEntity.decision).toBe(1);
      const [d] = await db.select().from(s.decisions).where(eq(s.decisions.id, dec.id));
      expect(d!.archivedAt).not.toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('arrastra a los hijos del proyecto que archiva', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto cerrado' });
      const tarea = await createTask(db, ctx, { title: 'Tarea', projectId: pr.id });
      await db.update(s.projects).set({ status: 'CLOSED' }).where(eq(s.projects.id, pr.id));
      await ageUpdated('projects', pr.id, 30);

      await archiveTerminalRecords(db, ctx, {});
      const [t] = await db.select().from(s.tasks).where(eq(s.tasks.id, tarea.id));
      expect(t!.archivedAt).not.toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });

  it('no toca las tareas por su cuenta (tienen su propia política de retención)', async () => {
    const ctx = await makeOrg();
    try {
      const pr = await createProject(db, ctx, { name: 'Proyecto activo' });
      const tarea = await createTask(db, ctx, { title: 'Tarea hecha', projectId: pr.id, status: 'DONE' });
      await ageUpdated('tasks', tarea.id, 90);

      const res = await archiveTerminalRecords(db, ctx, {});
      expect(res.byEntity.task).toBeUndefined();
      const [t] = await db.select().from(s.tasks).where(eq(s.tasks.id, tarea.id));
      expect(t!.archivedAt).toBeNull();
    } finally {
      await dropOrg(ctx);
    }
  });
});
