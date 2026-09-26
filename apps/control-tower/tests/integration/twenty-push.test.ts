import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  updateClient,
  updateContact,
  createClient,
  createContact,
  createOpportunity,
  changeOpportunityStage,
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
 * Write-back CT → Twenty. **Desde ADR-009 (owner 2026-09-26) lo único que CT escribe en Twenty es el `stage` de una
 * oportunidad.** No golpea Twenty real: usa un DataSource fake que captura los PATCH.
 *
 * Verifica las dos mitades de la decisión: (1) mover el stage sigue empujando, con el cuerpo correcto y resolviendo
 * el id por `external_identities`; (2) un cliente, un contacto o una task que vinieron de Twenty **no se pueden
 * editar en CT** y no encolan nada; (3) lo nativo de CT sí se edita y no se empuja a ninguna parte.
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
  await db.delete(s.opportunities).where(eq(s.opportunities.organizationId, ctx.organizationId));
  await db.delete(s.contacts).where(eq(s.contacts.organizationId, ctx.organizationId));
  await db.delete(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
  await db.delete(s.tasks).where(eq(s.tasks.organizationId, ctx.organizationId));
  await db.delete(s.organizationMembers).where(eq(s.organizationMembers.organizationId, ctx.organizationId));
  await db.delete(s.users).where(eq(s.users.id, ctx.userId));
  await db.delete(s.organizations).where(eq(s.organizations.id, ctx.organizationId));
}

describe('write-back a Twenty (ADR-009: sólo el stage de la oportunidad)', () => {
  it('mover el stage de una oportunidad sincronizada lo empuja a Twenty', async () => {
    const ctx = await makeOrg();
    const src = new CapturingSource();
    const registry: OutboxRegistry = {
      'twenty.push': async (ev, edb) => { await runTwentyEntityPush(edb, ctx, src, ev.aggregateType, ev.aggregateId); },
    };
    try {
      // Las oportunidades nacen en Twenty (ADR-008): se crea con actor SYSTEM, como hace el sync.
      const sysCtx: OrgContext = { userId: 'system', organizationId: ctx.organizationId, role: 'OWNER' };
      const opp = await createOpportunity(db, sysCtx, { name: 'Acme — web' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'opportunity', externalId: 'EXT-O1', internalType: 'opportunity', internalId: opp.id });

      await changeOpportunityStage(db, ctx, opp.id, 'NEGOTIATION');

      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, opp.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(1);

      await dispatchOutboxOnce(db, registry);

      expect(src.calls).toHaveLength(1);
      expect(src.calls[0]).toMatchObject({ resource: 'opportunities', id: 'EXT-O1' });
      expect(src.calls[0]!.body).toEqual({ stage: 'NEGOTIATION' }); // SÓLO el stage
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('un cliente que vino de Twenty no se edita en CT, y no encola ningún push', async () => {
    const ctx = await makeOrg();
    try {
      const client = await createClient(db, ctx, { name: 'Acme' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'company', externalId: 'EXT-1', internalType: 'client', internalId: client.id });

      // Nombre, industria y web son de Twenty (FIELD_OWNERSHIP): el comando los rechaza, no sólo la UI.
      await expect(updateClient(db, ctx, client.id, { name: 'Acme Corp' })).rejects.toThrow();
      await expect(updateClient(db, ctx, client.id, { industry: 'Retail' })).rejects.toThrow();

      // `status` y `notes` son columnas propias de CT: esas sí se editan…
      await updateClient(db, ctx, client.id, { status: 'INACTIVE', notes: 'Cliente en pausa' });
      // …y no generan ningún envío a Twenty (client ya no está en TWENTY_MIRRORED).
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, client.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('un contacto y una task de Twenty tampoco se editan, ni siquiera la fecha de la task', async () => {
    const ctx = await makeOrg();
    try {
      const contact = await createContact(db, ctx, { firstName: 'Ana', clientId: undefined });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'person', externalId: 'EXT-P1', internalType: 'contact', internalId: contact.id });
      await expect(updateContact(db, ctx, contact.id, { jobTitle: 'CTO' })).rejects.toThrow();

      const task = await createTask(db, ctx, { title: 'Llamar a Acme' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'task', externalId: 'EXT-T1', internalType: 'task', internalId: task.id });
      // La fecha era el último campo que CT poseía de una task de Twenty; con el write-back retirado, es de Twenty.
      await expect(updateTask(db, ctx, task.id, { dueDate: new Date('2027-03-01') })).rejects.toThrow();
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('lo NATIVO de CT se edita y no se empuja a ninguna parte', async () => {
    const ctx = await makeOrg();
    const src = new CapturingSource();
    try {
      const contact = await createContact(db, ctx, { firstName: 'Ana', clientId: undefined });
      await updateContact(db, ctx, contact.id, { jobTitle: 'CTO' }); // sin identidad Twenty → editable entero
      // Y aunque alguien invocara el push a mano, `contact` ya no es un destino válido.
      expect(await runTwentyEntityPush(db, ctx, src, 'contact', contact.id)).toBe('skip');
      expect(src.calls).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('el sync (actor SYSTEM) NO encola twenty.push (evita bucles)', async () => {
    const ctx = await makeOrg();
    const sysCtx: OrgContext = { userId: 'system', organizationId: ctx.organizationId, role: 'OWNER' };
    try {
      const opp = await createOpportunity(db, sysCtx, { name: 'Beta' });
      await upsertIdentity(db, ctx, { provider: 'TWENTY', externalType: 'opportunity', externalId: 'EXT-O2', internalType: 'opportunity', internalId: opp.id });
      // Un cambio de stage hecho por el sync (SYSTEM) no debe re-empujar.
      await changeOpportunityStage(db, sysCtx, opp.id, 'NEGOTIATION');
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, opp.id), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(events).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });
});
