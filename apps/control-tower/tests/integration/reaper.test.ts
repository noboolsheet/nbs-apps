import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inArray, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { reapStuckJobs, reapStuckOutbox, type OrgContext } from '@ct/application';

/** Crítico #3 auditoría — reaper de filas colgadas en PROCESSING (worker caído entre el claim y el fin). */
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
  const slug = `rp-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

const HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000);

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('reapStuckJobs', () => {
  it('reencola los colgados con intentos restantes, marca FAILED los agotados y no toca los recientes', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const base = { jobType: 'test.reaper', payload: {}, organizationId: ctx.organizationId, maxAttempts: 5 } as const;
      const [stuck] = await tx.insert(s.jobs).values({ ...base, status: 'PROCESSING', lockedAt: HOUR_AGO(), lockedBy: 'dead', attempts: 1 }).returning();
      const [exhausted] = await tx.insert(s.jobs).values({ ...base, status: 'PROCESSING', lockedAt: HOUR_AGO(), lockedBy: 'dead', attempts: 5 }).returning();
      const [fresh] = await tx.insert(s.jobs).values({ ...base, status: 'PROCESSING', lockedAt: new Date(), lockedBy: 'alive', attempts: 1 }).returning();

      await reapStuckJobs(tx, { staleMs: 60_000 });

      const rows = await tx.select().from(s.jobs).where(inArray(s.jobs.id, [stuck!.id, exhausted!.id, fresh!.id]));
      const byId = new Map(rows.map((r) => [r.id, r]));
      expect(byId.get(stuck!.id)!.status).toBe('PENDING');
      expect(byId.get(stuck!.id)!.lockedAt).toBeNull();
      expect(byId.get(exhausted!.id)!.status).toBe('FAILED');
      expect(byId.get(fresh!.id)!.status).toBe('PROCESSING'); // reciente: no se toca
    });
  });
});

describe('reapStuckOutbox', () => {
  it('reencola los colgados y marca FAILED los que agotan intentos; no toca los recientes', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const base = { eventType: 'notion.push', aggregateType: 'task', payload: {}, organizationId: ctx.organizationId } as const;
      const [stuck] = await tx.insert(s.outboxEvents).values({ ...base, aggregateId: crypto.randomUUID(), status: 'PROCESSING', availableAt: HOUR_AGO(), attempts: 0 }).returning();
      const [exhausted] = await tx.insert(s.outboxEvents).values({ ...base, aggregateId: crypto.randomUUID(), status: 'PROCESSING', availableAt: HOUR_AGO(), attempts: 4 }).returning();
      const [fresh] = await tx.insert(s.outboxEvents).values({ ...base, aggregateId: crypto.randomUUID(), status: 'PROCESSING', availableAt: new Date(), attempts: 0 }).returning();

      await reapStuckOutbox(tx, { staleMs: 60_000 });

      const rows = await tx.select().from(s.outboxEvents).where(inArray(s.outboxEvents.id, [stuck!.id, exhausted!.id, fresh!.id]));
      const byId = new Map(rows.map((r) => [r.id, r]));
      expect(byId.get(stuck!.id)!.status).toBe('PENDING');
      expect(byId.get(stuck!.id)!.attempts).toBe(1);
      expect(byId.get(exhausted!.id)!.status).toBe('FAILED'); // attempts 4 → +1 = 5 = MAX
      expect(byId.get(fresh!.id)!.status).toBe('PROCESSING'); // reciente: no se toca
    });
  });
});
