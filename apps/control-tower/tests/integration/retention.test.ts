import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  ARCHIVABLE,
  archiveRecords,
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
