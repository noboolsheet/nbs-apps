import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  updateClient,
  updateContact,
  createClient,
  createContact,
  createTask,
  updateTask,
  dispatchOutboxOnce,
  runTwentyEntityPush,
  upsertIdentity,
  type OutboxRegistry,
  type OrgContext,
} from '@ct/application';
import type { TwentyDataSource, TwentyRawRecord } from '@ct/integrations';

/**
 * Write-back CT → Twenty (E-1). No golpea Twenty real: usa un DataSource fake que captura los PATCH.
 * Verifica: (1) editar por USER encola `twenty.push`; (2) el handler resuelve el id de Twenty por
 * external_identities y manda el cuerpo correcto; (3) sin identidad Twenty → skip (no crea nada).
 */
const db = getDb();

/** Fake que solo captura los update(); el resto no se usa en estas pruebas. */
class CapturingSource implements TwentyDataSource {
  calls: { resource: string; id: string; body: Record<string, unknown> }[] = [];
  async ping() { return true; }
  async companies(): Promise<TwentyRawRecord[]> { return []; }
  async people(): Promise<TwentyRawRecord[]> { return []; }
  async opportunities(): Promise<TwentyRawRecord[]> { return []; }
  async tasks(): Promise<TwentyRawRecord[]> { return []; }
  async update(resource: string, id: string, body: Record<string, unknown>) {
    this.calls.push({ resource, id, body });
  }
}

beforeAll(async () => { await db.execute(sql`select 1`); });
afterAll(async () => { await closeDb(); });

async function makeOrg(): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `tw-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await db.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await db.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}
async function cleanupOrg(ctx: OrgContext) {
  await db.delete(s.outboxEvents).where(eq(s.outboxEvents.organizationId, ctx.organizationId));
  await db.delete(s.externalIdentities).where(eq(s.externalIdentities.organizationId, ctx.organizationId));
  await db.delete(s.auditLogs).where(eq(s.auditLogs.organizationId, ctx.organizationId));
  // F-4: las ediciones emiten change_events; también cuelgan de la organización.
  await db.delete(s.changeEvents).where(eq(s.changeEvents.organizationId, ctx.organizationId));
  await db.delete(s.contacts).where(eq(s.contacts.organizationId, ctx.organizationId));
  await db.delete(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
  await db.delete(s.tasks).where(eq(s.tasks.organizationId, ctx.organizationId));
  await db.delete(s.organizationMembers).where(eq(s.organizationMembers.organizationId, ctx.organizationId));
  await db.delete(s.users).where(eq(s.users.id, ctx.userId));
  await db.delete(s.organizations).where(eq(s.organizations.id, ctx.organizationId));
}

describe('write-back a Twenty (E-1)', () => {
  it('editar un cliente sincronizado empuja name+domainName+industry a su company', async () => {
    const ctx = await makeOrg();
    const src = new CapturingSource();
    const registry: OutboxRegistry = {
      'twenty.push': async (ev, edb) => { await runTwentyEntityPush(edb, ctx, src, ev.aggregateType, ev.aggregateId); },
    };
    try {
      const client = await createClient(db, ctx, { name: 'Acme' });
      // Simula que vino de Twenty: identidad company/EXT-1.
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'company', externalId: 'EXT-1', internalType: 'client', internalId: client.id });

      await updateClient(db, ctx, client.id, { name: 'Acme Corp', websiteUrl: 'https://acme.com', industry: 'Retail' });

      // Se encoló twenty.push
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, client.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(1);

      await dispatchOutboxOnce(db, registry);

      expect(src.calls).toHaveLength(1);
      expect(src.calls[0]).toMatchObject({ resource: 'companies', id: 'EXT-1' });
      expect(src.calls[0]!.body).toEqual({ name: 'Acme Corp', domainName: { primaryLinkUrl: 'acme.com' }, industry: 'Retail' });
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('reprogramar una task sincronizada empuja su nueva fecha (dueAt) a Twenty', async () => {
    const ctx = await makeOrg();
    const src = new CapturingSource();
    const registry: OutboxRegistry = {
      'twenty.push': async (ev, edb) => { await runTwentyEntityPush(edb, ctx, src, ev.aggregateType, ev.aggregateId); },
    };
    try {
      const task = await createTask(db, ctx, { title: 'Llamar a Acme' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'task', externalId: 'EXT-T1', internalType: 'task', internalId: task.id });

      await updateTask(db, ctx, task.id, { dueDate: new Date('2027-03-01') });

      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, task.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(1);

      await dispatchOutboxOnce(db, registry);

      expect(src.calls).toHaveLength(1);
      expect(src.calls[0]).toMatchObject({ resource: 'tasks', id: 'EXT-T1' });
      expect(src.calls[0]!.body).toEqual({ dueAt: '2027-03-01T00:00:00.000Z' });
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('editar un contacto SIN identidad Twenty → skip (no crea en Twenty)', async () => {
    const ctx = await makeOrg();
    const src = new CapturingSource();
    try {
      const contact = await createContact(db, ctx, { firstName: 'Ana', clientId: undefined });
      await updateContact(db, ctx, contact.id, { jobTitle: 'CTO' });
      // El id no tiene external_identity TWENTY → push es no-op
      const res = await runTwentyEntityPush(db, ctx, src, 'contact', contact.id);
      expect(res).toBe('skip');
      expect(src.calls).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('el sync (actor SYSTEM) NO encola twenty.push (evita bucles)', async () => {
    const ctx = await makeOrg();
    const sysCtx: OrgContext = { userId: 'system', organizationId: ctx.organizationId, role: 'OWNER' };
    try {
      const client = await createClient(db, ctx, { name: 'Beta' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'company', externalId: 'EXT-2', internalType: 'client', internalId: client.id });
      // Una edición hecha por el sync (SYSTEM) no debe re-empujar.
      await updateClient(db, sysCtx, client.id, { name: 'Beta 2' });
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, client.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });
});
