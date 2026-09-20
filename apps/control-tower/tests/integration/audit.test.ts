import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createProject,
  changeProjectStatus,
  createTask,
  updateTaskStatus,
  createDecision,
  updateDecisionStatus,
  listRecentAudit,
  getSystemHealth,
  updateProject,
  updateClient,
  createClient,
  createDeliverable,
  updateDeliverableStatus,
  createPortfolioItem,
  updatePortfolioItemStatus,
  listEntityChanges,
  type OrgContext,
} from '@ct/application';

/** M16 — auditoría (audit_logs + change_events) y System Health contra PostgreSQL real. */
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
  const slug = `au-${crypto.randomUUID().slice(0, 8)}`;
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

describe('audit + change events', () => {
  it('createProject registra un audit CREATE con el actor USER', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Audit proj' });
      const audits = await tx.select().from(s.auditLogs).where(and(eq(s.auditLogs.entityId, p.id), eq(s.auditLogs.entityType, 'project')));
      expect(audits).toHaveLength(1);
      expect(audits[0]!.action).toBe('CREATE');
      expect(audits[0]!.actorType).toBe('USER');
      expect(audits[0]!.actorUserId).toBe(ctx.userId);
    });
  });

  it('changeProjectStatus registra change_event (from→to) + audit', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      await changeProjectStatus(tx, ctx, p.id, 'ACTIVE');

      const changes = await tx.select().from(s.changeEvents).where(eq(s.changeEvents.entityId, p.id));
      expect(changes).toHaveLength(1);
      expect(changes[0]!.changeType).toBe('STATUS');
      expect((changes[0]!.previousState as { status: string }).status).toBe('PLANNED');
      expect((changes[0]!.newState as { status: string }).status).toBe('ACTIVE');

      // Audit del proyecto: CREATE (al crearlo) + UPDATE (al cambiar de estado).
      const audits = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.entityId, p.id), eq(s.auditLogs.entityType, 'project')));
      expect(audits.map((a) => a.action).sort()).toEqual(['CREATE', 'UPDATE']);
    });
  });

  it('task DONE registra audit COMPLETE; decision APPROVED registra audit APPROVE', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const t = await createTask(tx, ctx, { title: 't', projectId: p.id });
      await updateTaskStatus(tx, ctx, t.id, 'DONE');
      const taskAudits = await tx.select().from(s.auditLogs).where(eq(s.auditLogs.entityId, t.id));
      expect(taskAudits.some((a) => a.action === 'COMPLETE')).toBe(true);

      const d = await createDecision(tx, ctx, { title: 'X', decision: 'y' });
      await updateDecisionStatus(tx, ctx, d.id, 'REVIEW');
      await updateDecisionStatus(tx, ctx, d.id, 'APPROVED');
      const decAudits = await tx.select().from(s.auditLogs).where(eq(s.auditLogs.entityId, d.id));
      expect(decAudits.some((a) => a.action === 'APPROVE')).toBe(true);
    });
  });

  it('el timeline y el audit reciente están aislados por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createProject(tx, a, { name: 'A' });
      const recentB = await listRecentAudit(tx, b, 10);
      expect(recentB).toHaveLength(0);
    });
  });

  it('getSystemHealth devuelve db ok + estructura', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const health = await getSystemHealth(tx, ctx);
      expect(health.db.ok).toBe(true);
      expect(health).toHaveProperty('jobs');
      expect(health).toHaveProperty('outbox');
      expect(Array.isArray(health.integrations)).toBe(true);
    });
  });

  // --- F-4: diff campo a campo en las ediciones ---
  it('F-4: updateProject emite un change_event FIELDS sólo con lo que cambió', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'Antes', priority: 'MEDIUM' });
      await updateProject(tx, ctx, p.id, { name: 'Después', priority: 'MEDIUM' });

      const changes = await listEntityChanges(tx, ctx, 'project', p.id);
      const fields = changes.filter((c) => c.changeType === 'FIELDS');
      expect(fields).toHaveLength(1);
      expect(fields[0]!.previousState).toEqual({ name: 'Antes' });
      expect(fields[0]!.newState).toEqual({ name: 'Después' });
    });
  });

  it('F-4: un PATCH que no cambia nada NO emite change_event (el panel autoguarda a menudo)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const c = await createClient(tx, ctx, { name: 'Igual' });
      await updateClient(tx, ctx, c.id, { name: 'Igual' });
      const changes = await listEntityChanges(tx, ctx, 'client', c.id);
      expect(changes.filter((x) => x.changeType === 'FIELDS')).toHaveLength(0);
    });
  });

  // --- C-1: cobertura de auditoría que faltaba ---
  it('C-1: deliverable y portfolio_item registran audit y change_event de estado', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createProject(tx, ctx, { name: 'P' });
      const d = await createDeliverable(tx, ctx, p.id, { name: 'Entrega' });
      const creates = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.entityId, d.id), eq(s.auditLogs.entityType, 'deliverable')));
      expect(creates.map((a) => a.action)).toEqual(['CREATE']);

      await updateDeliverableStatus(tx, ctx, d.id, 'IN_PROGRESS');
      const dChanges = await listEntityChanges(tx, ctx, 'deliverable', d.id);
      expect(dChanges[0]!.changeType).toBe('STATUS');
      expect(dChanges[0]!.newState).toEqual({ status: 'IN_PROGRESS' });

      const item = await createPortfolioItem(tx, ctx, { name: 'Caso', type: 'CaseStudy' });
      await updatePortfolioItemStatus(tx, ctx, item.id, 'CANDIDATE');
      const pAudits = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.entityId, item.id), eq(s.auditLogs.entityType, 'portfolio_item')));
      expect(pAudits.map((a) => a.action).sort()).toEqual(['CREATE', 'UPDATE']);
      const iChanges = await listEntityChanges(tx, ctx, 'portfolio_item', item.id);
      expect(iChanges[0]!.newState).toEqual({ status: 'CANDIDATE' });
    });
  });
});
