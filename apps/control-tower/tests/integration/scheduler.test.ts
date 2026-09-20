import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { connectIntegration, enqueueScheduledSyncs, type OrgContext } from '@ct/application';

/** Fase 6 — scheduler de syncs: un job PENDING por integración conectada, con dedupe. */
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
  const slug = `sc-${crypto.randomUUID().slice(0, 8)}`;
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

describe('enqueueScheduledSyncs', () => {
  it('encola un job por integración conectada y deduplica en la 2ª pasada', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await connectIntegration(tx, ctx, { provider: 'TWENTY', displayName: 'T' });
      await connectIntegration(tx, ctx, { provider: 'NOTION', displayName: 'N' });

      const pendingForOrg = () =>
        tx.select().from(s.jobs).where(and(eq(s.jobs.organizationId, ctx.organizationId), eq(s.jobs.status, 'PENDING')));

      await enqueueScheduledSyncs(tx);
      expect(await pendingForOrg()).toHaveLength(2);

      // 2ª pasada: como siguen PENDING, no encola duplicados.
      await enqueueScheduledSyncs(tx);
      expect(await pendingForOrg()).toHaveLength(2);

      const types = (await pendingForOrg()).map((j) => j.jobType).sort();
      expect(types).toEqual(['integration.notion.sync', 'integration.twenty.sync']);
    });
  });

  it('no re-encola tras reiniciar (job del día ya completado); sí al día siguiente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await connectIntegration(tx, ctx, { provider: 'TWENTY', displayName: 'T' });
      const forOrg = () => tx.select().from(s.jobs).where(eq(s.jobs.organizationId, ctx.organizationId));

      await enqueueScheduledSyncs(tx, new Date('2026-01-01T07:00:00Z'));
      expect(await forOrg()).toHaveLength(1);

      // Simula que el sync del día ya corrió: COMPLETED con createdAt fijo a las 07:00.
      await tx
        .update(s.jobs)
        .set({ status: 'COMPLETED', createdAt: new Date('2026-01-01T07:00:00Z') })
        .where(eq(s.jobs.organizationId, ctx.organizationId));

      // "Reinicio" el mismo día (3h después): NO re-encola (job reciente, < 20h).
      await enqueueScheduledSyncs(tx, new Date('2026-01-01T10:00:00Z'));
      expect(await forOrg()).toHaveLength(1);

      // Día siguiente (el job del día anterior ya cae fuera de la ventana): sí encola uno nuevo.
      await enqueueScheduledSyncs(tx, new Date('2026-01-02T07:00:00Z'));
      expect(await forOrg()).toHaveLength(2);
    });
  });
});
