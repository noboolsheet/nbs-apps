import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  getHomeDashboard,
  createProject,
  changeProjectStatus,
  createTask,
  createClient,
  createOpportunity,
  captureKnowledge,
  createPayment,
  type OrgContext,
} from '@ct/application';

/** M09 — Home dashboard (proyección derivada) contra PostgreSQL real. */
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

async function makeOrg(tx: typeof db): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `h-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});
/** Contexto del SYNC: las oportunidades sólo las crea el sistema (nacen en Twenty). */
const sync = (c: OrgContext): OrgContext => ({ ...c, userId: 'system' });


describe('home dashboard', () => {
  it('agrega snapshot y active projects derivados de las entidades', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createClient(tx, ctx, { name: 'Acme' });
      const p = await createProject(tx, ctx, { name: 'Proj' });
      await changeProjectStatus(tx, ctx, p.id, 'ACTIVE');
      await createOpportunity(tx, sync(ctx), { name: 'Opp', stage: 'LEAD' });

      const d = await getHomeDashboard(tx, ctx);
      expect(d.snapshot.clients).toBe(1);
      expect(d.snapshot.projectsActive).toBe(1);
      expect(d.snapshot.opportunitiesOpen).toBe(1);
      expect(d.activeProjects.map((x) => x.id)).toContain(p.id);
    });
  });

  it('genera attention items (proyecto AT_RISK e inbox pendiente) con enlace a la fuente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Vencido', status: 'ACTIVE', targetDate: '2000-01-01' as unknown as Date });
      await captureKnowledge(tx, ctx, { rawContent: 'idea' });

      const d = await getHomeDashboard(tx, ctx);
      const atRisk = d.attention.find((a) => a.kind === 'project_at_risk');
      expect(atRisk).toBeTruthy();
      expect(atRisk!.href).toBe(`/projects/${p.id}`);
      expect(d.attention.some((a) => a.kind === 'inbox_pending')).toBe(true);
      expect(d.inboxPending).toBe(1);
    });
  });

  it("today's work sólo incluye tareas de hoy; las vencidas van al aviso (Fase 4)", async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const today = new Date().toISOString().slice(0, 10);
      await createTask(tx, ctx, { title: 'hoy', projectId: p.id, dueDate: today as unknown as Date });
      await createTask(tx, ctx, { title: 'vencida', projectId: p.id, dueDate: '2000-01-01' as unknown as Date });
      await createTask(tx, ctx, { title: 'futura', projectId: p.id, dueDate: '2999-01-01' as unknown as Date });

      const d = await getHomeDashboard(tx, ctx);
      const titles = d.todaysWork.map((t) => t.title);
      expect(titles).toContain('hoy');
      expect(titles).not.toContain('vencida'); // vencidas fuera de la vista principal
      expect(titles).not.toContain('futura');
      // Las vencidas se surfacean como aviso, no como lista.
      expect(d.attention.some((a) => a.kind === 'tasks_overdue')).toBe(true);
    });
  });

  it('el dashboard está aislado por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createClient(tx, b, { name: 'B client' });
      const d = await getHomeDashboard(tx, a);
      expect(d.snapshot.clients).toBe(0);
    });
  });

  it('la actividad reciente dice QUÉ se tocó, con nombre y detalle', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Web corporativa Acme' });
      await changeProjectStatus(tx, ctx, p.id, 'ACTIVE');

      const home = await getHomeDashboard(tx, ctx);
      const act = home.recentActivity.find((a) => a.entityType === 'project' && a.detail === 'ACTIVE');
      expect(act).toBeDefined();
      // Antes sólo se sabía "Actualizó proyecto"; ahora se sabe cuál y a qué estado.
      expect(act!.entityName).toBe('Web corporativa Acme');
    });
  });

  it('los pagos retrasados avisan en «Requiere atención»', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createPayment(tx, ctx, { concept: 'Factura vencida', amount: 500, dueDate: new Date('2020-01-01') });
      await createPayment(tx, ctx, { concept: 'Factura futura', amount: 100, dueDate: new Date('2999-01-01') });

      const home = await getHomeDashboard(tx, ctx);
      const aviso = home.attention.find((a) => a.kind === 'payments_overdue');
      expect(aviso).toBeDefined();
      expect(aviso!.label).toContain('1'); // sólo la vencida
      expect(aviso!.severity).toBe('high');
    });
  });
});
