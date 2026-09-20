import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { createDecision, type OrgContext } from '@ct/application';

/** Fase 5 — el push en tiempo real emite un evento outbox `notion.push` en acciones de USUARIO (no en el sync). */
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
  const userId = crypto.randomUUID(); // UUID → actor USER
  const slug = `rp-${crypto.randomUUID().slice(0, 8)}`;
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

describe('push en tiempo real (outbox notion.push)', () => {
  it('crear como USUARIO emite notion.push; como SYSTEM (sync) no', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const pushEvents = () =>
        tx.select().from(s.outboxEvents).where(and(eq(s.outboxEvents.organizationId, ctx.organizationId), eq(s.outboxEvents.eventType, 'notion.push')));

      const d = await createDecision(tx, ctx, { title: 'D usuario', decision: 'x' });
      const evs = await pushEvents();
      expect(evs).toHaveLength(1);
      expect(evs[0]!.aggregateType).toBe('decision');
      expect(evs[0]!.aggregateId).toBe(d.id);

      // El sync corre como SYSTEM (userId='system') → NO debe emitir (evita bucles).
      await createDecision(tx, { ...ctx, userId: 'system' }, { title: 'D system', decision: 'y' });
      expect(await pushEvents()).toHaveLength(1);
    });
  });
});
