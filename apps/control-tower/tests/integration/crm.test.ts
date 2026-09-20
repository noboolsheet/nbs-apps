import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createClient,
  createContact,
  createOpportunity,
  changeOpportunityStage,
  archiveClosedOpportunities,
  createTask,
  updateTask,
  listOpportunityTasks,
  listAllOpportunityTasks,
  getClientDetail,
  listOpportunities,
  listArchivedOpportunities,
  type OrgContext,
} from '@ct/application';
import { isAppError } from '@ct/shared';

/** M05 — casos de uso del CRM contra PostgreSQL real (aislados por transacción). */
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

/**
 * Contexto del SYNC (actor SYSTEM). Las oportunidades ya no las crea un usuario: nacen en Twenty y sólo el sync
 * puede insertarlas (owner 2026-09-02), así que los tests que necesitan una la crean como lo haría el worker.
 */
const sync = (ctx: OrgContext): OrgContext => ({ ...ctx, userId: 'system' });

async function makeOrg(tx: typeof db, role: OrgContext['role'] = 'OWNER'): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `c-${crypto.randomUUID().slice(0, 8)}`;
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

describe('crm use cases', () => {
  it('crea client (slug), contact y opportunity; el detalle los relaciona', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const client = await createClient(tx, ctx, { name: 'Acme Corp' });
      expect(client.slug).toBe('acme-corp');
      const contact = await createContact(tx, ctx, { firstName: 'Jane', clientId: client.id });
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Deal', clientId: client.id, stage: 'LEAD' });
      expect(opp.status).toBe('OPEN');

      const detail = await getClientDetail(tx, ctx, client.id);
      expect(detail.contacts.map((c) => c.id)).toContain(contact.id);
      expect(detail.opportunities.map((o) => o.id)).toContain(opp.id);
    });
  });

  it('ganar una opportunity deriva status WON pero NO la cierra; ONBOARDED sí sella closed_at', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Deal', stage: 'PROPOSAL_SENT' });
      // WON dejó de ser terminal (owner 2026-09-02): sigue en el tablero, así que no lleva marca de cierre.
      const won = await changeOpportunityStage(tx, ctx, opp.id, 'WON');
      expect(won.status).toBe('WON');
      expect(won.closedAt).toBeNull();
      // El cierre de verdad es ONBOARDED: mismo status, y ahí sí se sella closed_at (arranca la ventana de archivado).
      const onboarded = await changeOpportunityStage(tx, ctx, opp.id, 'ONBOARDED');
      expect(onboarded.status).toBe('WON');
      expect(onboarded.closedAt).not.toBeNull();
    });
  });

  it('no permite reabrir una opportunity cerrada (ADR-002)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Deal', stage: 'NEGOTIATION' });
      await changeOpportunityStage(tx, ctx, opp.id, 'LOST');
      await expect(changeOpportunityStage(tx, ctx, opp.id, 'LEAD')).rejects.toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    });
  });

  it('rechaza crear opportunity con un client de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      const clientB = await createClient(tx, b, { name: 'B client' });
      const err = await createOpportunity(tx, sync(a), { name: 'X', clientId: clientB.id }).catch((e) => e);
      expect(isAppError(err) && err.kind).toBe('NOT_FOUND');
    });
  });

  it('listOpportunities filtra por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createOpportunity(tx, sync(a), { name: 'A opp' });
      await createOpportunity(tx, sync(b), { name: 'B opp' });
      const listA = await listOpportunities(tx, a);
      expect(listA).toHaveLength(1);
      expect(listA[0]!.name).toBe('A opp');
    });
  });

  it('archiveClosedOpportunities archiva las perdidas ≥1 semana; NO archiva las ganadas ni las abiertas; idempotente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const open = await createOpportunity(tx, sync(ctx), { name: 'Abierta', stage: 'PROPOSAL_SENT' });
      const won = await createOpportunity(tx, sync(ctx), { name: 'Ganada', stage: 'NEGOTIATION' });
      const lost = await createOpportunity(tx, sync(ctx), { name: 'Perdida', stage: 'NEGOTIATION' });
      await changeOpportunityStage(tx, ctx, won.id, 'WON'); // WON no es terminal → sin closedAt, no se auto-archiva
      await changeOpportunityStage(tx, ctx, lost.id, 'LOST'); // closedAt ≈ ahora

      // Simula "8 días después": las cerradas superan la ventana de 7 días.
      const now = new Date(Date.now() + 8 * 86_400_000);
      const res = await archiveClosedOpportunities(tx, ctx, { olderThanDays: 7, now });
      expect(res.archived).toBe(1); // solo la perdida

      const active = await listOpportunities(tx, ctx);
      // Kanban: quedan la abierta y la GANADA (Ganada no es final → no se archiva sola).
      expect(active.map((o) => o.id).sort()).toEqual([open.id, won.id].sort());
      const arch = await listArchivedOpportunities(tx, ctx);
      expect(arch.map((o) => o.id)).toEqual([lost.id]);

      // Idempotente: una segunda pasada no re-archiva nada.
      const again = await archiveClosedOpportunities(tx, ctx, { olderThanDays: 7, now });
      expect(again.archived).toBe(0);
    });
  });

  it('WON→ONBOARDED (ganada e incorporada): sigue status WON, congela y oculta sus tareas, y a los 7 días se auto-archiva con ellas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Deal', stage: 'NEGOTIATION' });
      await changeOpportunityStage(tx, ctx, opp.id, 'WON');
      const t = await createTask(tx, ctx, { title: 'preventa', opportunityId: opp.id });
      // Ganada activa: su tarea se ve en la lista de preventa.
      expect((await listAllOpportunityTasks(tx, ctx)).map((x) => x.id)).toContain(t.id);
      // Cerrar (cliente ya incorporado): WON→ONBOARDED; sigue contando como GANADA (status WON).
      const closed = await changeOpportunityStage(tx, ctx, opp.id, 'ONBOARDED');
      expect(closed.stage).toBe('ONBOARDED');
      expect(closed.status).toBe('WON');
      // Sus tareas: fuera de la lista de preventa y congeladas (no editables).
      expect((await listAllOpportunityTasks(tx, ctx)).map((x) => x.id)).not.toContain(t.id);
      await expect(updateTask(tx, ctx, t.id, { priority: 'HIGH' })).rejects.toMatchObject({ code: 'OPPORTUNITY_CLOSED' });
      // A los 8 días: la cerrada se auto-archiva (columna «Cerradas») junto con sus tareas.
      const now = new Date(Date.now() + 8 * 86_400_000);
      const res = await archiveClosedOpportunities(tx, ctx, { olderThanDays: 7, now });
      expect(res.archived).toBe(1);
      const [oppRow] = await tx.select({ archivedAt: s.opportunities.archivedAt }).from(s.opportunities).where(eq(s.opportunities.id, opp.id));
      expect(oppRow!.archivedAt).not.toBeNull();
      const [taskRow] = await tx.select({ archivedAt: s.tasks.archivedAt }).from(s.tasks).where(eq(s.tasks.id, t.id));
      expect(taskRow!.archivedAt).not.toBeNull();
    });
  });

  it('archiveClosedOpportunities respeta la ventana: no archiva una perdida recién cerrada', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Recién perdida', stage: 'PROPOSAL_SENT' });
      await changeOpportunityStage(tx, ctx, opp.id, 'LOST');
      // Sin avanzar el reloj: closedAt ≈ ahora → dentro de la ventana → NO se archiva.
      const res = await archiveClosedOpportunities(tx, ctx, { olderThanDays: 7 });
      expect(res.archived).toBe(0);
      expect(await listArchivedOpportunities(tx, ctx)).toHaveLength(0);
    });
  });

  it('crea tareas dentro de una oportunidad y las lista (por-oportunidad y global)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Deal preventa', stage: 'PROPOSAL_SENT' });
      const task = await createTask(tx, ctx, { title: 'Preparar propuesta', opportunityId: opp.id });
      expect(task.opportunityId).toBe(opp.id);
      expect(task.projectId).toBeNull();
      expect(task.personal).toBe(false);

      const perOpp = await listOpportunityTasks(tx, ctx, opp.id);
      expect(perOpp.map((t) => t.id)).toEqual([task.id]);
      const global = await listAllOpportunityTasks(tx, ctx);
      expect(global.map((t) => t.id)).toContain(task.id);
      expect(global.find((t) => t.id === task.id)?.opportunityName).toBe('Deal preventa');
    });
  });

  it('un USUARIO no puede crear oportunidades: nacen en Twenty y sólo las inserta el sync', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await expect(createOpportunity(tx, ctx, { name: 'A mano' })).rejects.toMatchObject({
        code: 'OPPORTUNITY_EXTERNAL_ONLY',
      });
      // Y el mismo comando, con el contexto del sync, sí crea.
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Del sync' });
      expect(opp.name).toBe('Del sync');
    });
  });

  it('una oportunidad ARCHIVADA queda congelada: sin cambiar stage y sin añadir tareas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Congelada', stage: 'PROPOSAL_SENT' });
      await tx.update(s.opportunities).set({ archivedAt: new Date() }).where(eq(s.opportunities.id, opp.id));

      await expect(changeOpportunityStage(tx, ctx, opp.id, 'WON')).rejects.toMatchObject({
        code: 'OPPORTUNITY_ARCHIVED',
      });
      await expect(createTask(tx, ctx, { title: 'Nueva', opportunityId: opp.id })).rejects.toMatchObject({
        code: 'OPPORTUNITY_ARCHIVED',
      });
    });
  });

  it('no se puede editar una tarea cuya oportunidad está archivada', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const opp = await createOpportunity(tx, sync(ctx), { name: 'Con tarea', stage: 'PROPOSAL_SENT' });
      const task = await createTask(tx, ctx, { title: 'Tarea preventa', opportunityId: opp.id });
      await tx.update(s.opportunities).set({ archivedAt: new Date() }).where(eq(s.opportunities.id, opp.id));
      await expect(updateTask(tx, ctx, task.id, { title: 'Cambiada' })).rejects.toMatchObject({
        code: 'OPPORTUNITY_ARCHIVED',
      });
    });
  });
});
