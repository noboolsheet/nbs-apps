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
  createDecision,
  updateDecisionStatus,
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
      // Las tres cifras que quedan son las que NO tienen lista en Home (owner 2026-09-27): carga, embudo y bandeja.
      // «Clientes», «Decisiones» y «Proyectos activos» se retiraron — el último repetía la lista de abajo.
      expect(d.snapshot.opportunitiesOpen).toBe(1);
      expect(d.snapshot.tasksOpen).toBe(0);
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
      // La bandeja pendiente es una CIFRA, no una alerta: «Requiere atención» se quedó sólo con lo que no aparece en
      // ningún otro bloque de la página. Si vuelve a colarse como alerta, esto falla.
      expect(d.attention.some((a) => a.kind === 'inbox_pending')).toBe(false);
      expect(d.snapshot.inboxPending).toBe(1);
    });
  });

  it('cada tarea cae en su cubo: vencidas · hoy · próximos 7 días · sin fecha', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const day = (offset: number) => {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() + offset);
        return d.toISOString().slice(0, 10) as unknown as Date;
      };
      await createTask(tx, ctx, { title: 'hoy', projectId: p.id, dueDate: day(0) });
      await createTask(tx, ctx, { title: 'vencida', projectId: p.id, dueDate: day(-30) });
      await createTask(tx, ctx, { title: 'en tres días', projectId: p.id, dueDate: day(3) });
      await createTask(tx, ctx, { title: 'lejana', projectId: p.id, dueDate: day(60) });
      await createTask(tx, ctx, { title: 'sin fecha', projectId: p.id });

      const d = await getHomeDashboard(tx, ctx);
      expect(d.todaysWork.map((t) => t.title)).toEqual(['hoy']);
      expect(d.overdue.map((t) => t.title)).toEqual(['vencida']);
      // «Próximos 7 días»: el agujero que había — una tarea para mañana no se veía desde Inicio hasta el día mismo.
      expect(d.upcoming.map((t) => t.title)).toEqual(['en tres días']);
      // Y las que no tienen fecha se cuentan (no se listan, serían un cajón de sastre).
      expect(d.tasksNoDue).toBe(1);
      expect(d.overdueTasks).toBe(1);
      // Las vencidas YA NO son un aviso: tienen su propia lista, con acciones, en la misma página.
      expect(d.attention.some((a) => a.kind === 'tasks_overdue')).toBe(false);
      expect(d.attention.some((a) => a.kind === 'tasks_due')).toBe(false);
    });
  });

  it('el dashboard está aislado por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createClient(tx, b, { name: 'B client' });
      await createOpportunity(tx, sync(b), { name: 'Opp de B', stage: 'LEAD' });
      await createPayment(tx, b, { concept: 'Cobro de B', amount: 500 });
      const d = await getHomeDashboard(tx, a);
      expect(d.snapshot.opportunitiesOpen).toBe(0);
      expect(d.money.pending).toEqual([]);
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

  it('el dinero sale con importes: te deben, debes y lo retrasado', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createPayment(tx, ctx, { concept: 'Factura vencida', amount: 500, dueDate: new Date('2020-01-01') });
      await createPayment(tx, ctx, { concept: 'Factura futura', amount: 100, dueDate: new Date('2999-01-01') });
      await createPayment(tx, ctx, { concept: 'Hosting', amount: 40, direction: 'OUT', payeeLabel: 'Proveedor' });

      const home = await getHomeDashboard(tx, ctx);
      const pendIn = home.money.pending.find((r) => r.direction === 'IN');
      const pendOut = home.money.pending.find((r) => r.direction === 'OUT');
      expect(pendIn).toMatchObject({ total: 600, count: 2 });
      expect(pendOut).toMatchObject({ total: 40, count: 1 });
      // Lo retrasado, con IMPORTE: antes era un aviso con el número de pagos, que no dice si son 40 € o 4.000 €.
      expect(home.money.overdue).toMatchObject([{ direction: 'IN', total: 500, count: 1 }]);
      // Y ya no se duplica como alerta.
      expect(home.attention.some((a) => a.kind === 'payments_overdue')).toBe(false);
    });
  });

  it('las decisiones de Home son las que están EN REVISIÓN, no las últimas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const borrador = await createDecision(tx, ctx, { title: 'Sin decidir', decision: 'X' });
      const enRevision = await createDecision(tx, ctx, { title: 'Esperando cierre', decision: 'Y' });
      await updateDecisionStatus(tx, ctx, enRevision.id, 'REVIEW');

      const home = await getHomeDashboard(tx, ctx);
      expect(home.decisionsInReview.map((x) => x.id)).toEqual([enRevision.id]);
      expect(home.decisionsInReview.map((x) => x.id)).not.toContain(borrador.id);
    });
  });
});
