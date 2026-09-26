import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, asc, eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createProject,
  createDeliverable,
  createStrategicArea,
  createGoal,
  reorderRecords,
  listGoalsByArea,
  type OrgContext,
} from '@ct/application';

/**
 * E-12 — orden manual contra PostgreSQL real. Lo que hay que atar no es que el update escriba (eso es trivial),
 * sino las tres formas de **revolver una lista ajena**: una entidad que no se ordena a mano, ids que no son de la
 * organización, e hijos de padres distintos en el mismo payload.
 */
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
  const slug = `ro-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

beforeAll(() => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerido para los tests de integración');
});
afterAll(async () => {
  await closeDb();
});

describe('orden manual de listas (E-12)', () => {
  it('guarda el orden que se manda y la consulta lo devuelve así', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const area = await createStrategicArea(tx, ctx, { name: 'Área' });
      const a = await createGoal(tx, ctx, { name: 'A', strategicAreaId: area.id });
      const b = await createGoal(tx, ctx, { name: 'B', strategicAreaId: area.id });
      const c = await createGoal(tx, ctx, { name: 'C', strategicAreaId: area.id });

      await reorderRecords(tx, ctx, { entityType: 'goal', ids: [c.id, a.id, b.id] });

      const rows = await listGoalsByArea(tx, ctx, area.id);
      expect(rows.map((g) => g.name)).toEqual(['C', 'A', 'B']);
      // `sort_order` es la posición 1..n, no un hueco arbitrario.
      expect(rows.map((g) => g.sortOrder)).toEqual([1, 2, 3]);

      // Y queda UNA entrada de auditoría por el gesto, no una por fila.
      const audit = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.organizationId, ctx.organizationId), eq(s.auditLogs.action, 'REORDER')));
      expect(audit).toHaveLength(1);
      expect(audit[0]!.entityType).toBe('goal');
    });
  });

  it('rechaza una entidad que no se ordena a mano', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await expect(
        reorderRecords(tx, ctx, { entityType: 'client', ids: [crypto.randomUUID(), crypto.randomUUID()] }),
      ).rejects.toThrow();
    });
  });

  it('rechaza ids que no existen o no son de la organización, y no escribe nada', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const other = await makeOrg(tx);
      const area = await createStrategicArea(tx, ctx, { name: 'Área' });
      const mine = await createGoal(tx, ctx, { name: 'Mío', strategicAreaId: area.id });
      const otherArea = await createStrategicArea(tx, other, { name: 'Área ajena' });
      const theirs = await createGoal(tx, other, { name: 'Ajeno', strategicAreaId: otherArea.id });

      await expect(reorderRecords(tx, ctx, { entityType: 'goal', ids: [theirs.id, mine.id] })).rejects.toThrow();

      // Un registro nuevo nace con `sort_order = 0` (el default; el relleno de la migración sólo tocó las filas
      // que ya existían). Sigue en 0 ⇒ el rechazo no escribió nada.
      const [after] = await tx.select().from(s.goals).where(eq(s.goals.id, mine.id));
      expect(after!.sortOrder).toBe(0);
    });
  });

  it('rechaza mezclar hijos de padres distintos', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p1 = await createProject(tx, ctx, { name: 'Proyecto 1' });
      const p2 = await createProject(tx, ctx, { name: 'Proyecto 2' });
      const d1 = await createDeliverable(tx, ctx, p1.id, { name: 'Entregable 1' });
      const d2 = await createDeliverable(tx, ctx, p2.id, { name: 'Entregable 2' });

      await expect(
        reorderRecords(tx, ctx, { entityType: 'deliverable', ids: [d2.id, d1.id] }),
      ).rejects.toThrow();
    });
  });

  it('las fases de un proyecto se reordenan dentro de su proyecto', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const project = await createProject(tx, ctx, { name: 'Proyecto' });
      const [f1] = await tx.insert(s.projectPhases).values({ projectId: project.id, name: 'Uno', status: 'PENDING', sortOrder: 1 }).returning();
      const [f2] = await tx.insert(s.projectPhases).values({ projectId: project.id, name: 'Dos', status: 'PENDING', sortOrder: 2 }).returning();

      await reorderRecords(tx, ctx, { entityType: 'project_phase', ids: [f2!.id, f1!.id] });

      const rows = await tx
        .select()
        .from(s.projectPhases)
        .where(eq(s.projectPhases.projectId, project.id))
        .orderBy(asc(s.projectPhases.sortOrder));
      expect(rows.map((r) => r.name)).toEqual(['Dos', 'Uno']);
    });
  });
});
