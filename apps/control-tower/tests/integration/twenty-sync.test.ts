import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  syncTwenty,
  resolveInternalId,
  updateTask,
  changeOpportunityStage,
  listFailedOutbox,
  retryFailedOutbox,
  discardFailedOutbox,
  type OrgContext,
} from '@ct/application';
import { TwentyAdapter, type TwentyDataSource, type TwentyRawRecord } from '@ct/integrations';

/**
 * M12 — sync idempotente de Twenty con un DataSource FIXTURE (sin Twenty real).
 * Aislado por transacción con rollback.
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
  const slug = `tw-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

class FixtureSource implements TwentyDataSource {
  constructor(
    private data: {
      companies: TwentyRawRecord[];
      people: TwentyRawRecord[];
      opportunities: TwentyRawRecord[];
      tasks?: TwentyRawRecord[];
    },
  ) {}
  async ping() {
    return true;
  }
  async companies() {
    return this.data.companies;
  }
  async people() {
    return this.data.people;
  }
  async opportunities() {
    return this.data.opportunities;
  }
  async tasks() {
    return this.data.tasks ?? [];
  }
  async update() {
    // El sync (pull) no escribe; el write-back se prueba aparte (twenty-push.test.ts).
  }
}

function fixture() {
  return {
    companies: [
      { id: 'c1', name: 'Acme', industry: 'Retail' },
      { id: 'c2', name: 'Globex' },
    ],
    people: [{ id: 'p1', name: { firstName: 'Jane', lastName: 'Doe' }, emails: { primaryEmail: 'jane@acme.com' }, companyId: 'c1' }],
    opportunities: [{ id: 'o1', name: 'Acme deal', stage: 'PROPOSAL_SENT', companyId: 'c1' }],
  };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});
/** Contexto del SYNC (actor SYSTEM), como lo invoca el worker: sólo el sistema crea oportunidades. */
const sync = (c: OrgContext): OrgContext => ({ ...c, userId: 'system' });


describe('twenty sync (fixture)', () => {
  it('primera ejecución crea entidades + external_identities', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const adapter = new TwentyAdapter(new FixtureSource(fixture()));
      const summary = await syncTwenty(tx, sync(ctx), adapter);
      expect(summary.companies.created).toBe(2);
      expect(summary.people.created).toBe(1);
      expect(summary.opportunities.created).toBe(1);

      const clients = await tx.select().from(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
      expect(clients).toHaveLength(2);
      // opp enlazada al client de c1 via identidad
      const c1Internal = await resolveInternalId(tx, ctx, 'TWENTY', 'company', 'c1');
      const [opp] = await tx.select().from(s.opportunities).where(eq(s.opportunities.organizationId, ctx.organizationId));
      expect(opp!.clientId).toBe(c1Internal);
      expect(opp!.stage).toBe('PROPOSAL_SENT');
    });
  });

  it('re-ejecutar es idempotente (no duplica; actualiza)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      // cambia el nombre de Acme en la "fuente" y re-sincroniza
      data.companies[0]!.name = 'Acme Corp';
      const second = await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      expect(second.companies.created).toBe(0);
      expect(second.companies.updated).toBe(2);

      const clients = await tx.select().from(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
      expect(clients).toHaveLength(2); // sin duplicados
      const names = clients.map((c) => c.name).sort();
      expect(names).toContain('Acme Corp'); // proyección actualizada
      const identities = await tx.select().from(s.externalIdentities).where(eq(s.externalIdentities.organizationId, ctx.organizationId));
      expect(identities).toHaveLength(4); // 2 companies + 1 person + 1 opportunity
    });
  });

  it('guarda metadata.url (deep link "Open in CRM") cuando hay crmBaseUrl (F-1)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const adapter = new TwentyAdapter(new FixtureSource(fixture()));
      await syncTwenty(tx, sync(ctx), adapter, { crmBaseUrl: 'http://100.1.2.3:3000/' });
      const c1 = await resolveInternalId(tx, ctx, 'TWENTY', 'company', 'c1');
      const [ident] = await tx
        .select()
        .from(s.externalIdentities)
        .where(eq(s.externalIdentities.internalId, c1!));
      expect((ident!.metadata as { url?: string }).url).toBe('http://100.1.2.3:3000/object/company/c1');
    });
  });

  it('sin crmBaseUrl, metadata.url queda null', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(fixture())));
      const c1 = await resolveInternalId(tx, ctx, 'TWENTY', 'company', 'c1');
      const [ident] = await tx
        .select()
        .from(s.externalIdentities)
        .where(eq(s.externalIdentities.internalId, c1!));
      expect((ident!.metadata as { url?: string | null }).url).toBeNull();
    });
  });

  it('un registro inválido no aborta el resto del pull (resiliencia F-13)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      // c2 "Globex" tiene industry demasiado largo → createClient lo rechaza; c1 debe crearse igual.
      const data = fixture();
      (data.companies[1] as { industry?: string }).industry = 'x'.repeat(200);
      const summary = await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      expect(summary.companies.created).toBe(1); // sólo Acme
      expect(summary.skipped).toHaveLength(1);
      expect(summary.skipped[0]).toMatchObject({ entity: 'company', externalId: 'c2' });
      const clients = await tx.select().from(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
      expect(clients.map((c) => c.name)).toContain('Acme');
      expect(clients.map((c) => c.name)).not.toContain('Globex');
    });
  });

  it('importa tasks de Twenty como tasks de CT (origen Twenty, sin proyecto)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = { ...fixture(), tasks: [{ id: 't1', title: 'Llamar a Acme', status: 'TODO', dueAt: '2026-12-31T10:00:00Z' }] };
      const summary = await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      expect(summary.tasks.created).toBe(1);
      const [task] = await tx.select().from(s.tasks).where(and(eq(s.tasks.organizationId, ctx.organizationId), eq(s.tasks.title, 'Llamar a Acme')));
      expect(task!.status).toBe('TODO');
      expect(task!.dueDate).toBe('2026-12-31');
      expect(task!.projectId).toBeNull(); // Twenty no tiene proyecto
      const ids = await tx.select().from(s.externalIdentities).where(and(eq(s.externalIdentities.organizationId, ctx.organizationId), eq(s.externalIdentities.internalType, 'task')));
      expect(ids).toHaveLength(1);
    });
  });

  it('un segundo sync NO pisa la fecha reprogramada en CT (CT es dueño de dueDate), pero sí re-sincroniza el título', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = { ...fixture(), tasks: [{ id: 't1', title: 'Llamar a Acme', status: 'TODO', dueAt: '2026-12-31T10:00:00Z' }] };
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      const [task] = await tx.select().from(s.tasks).where(and(eq(s.tasks.organizationId, ctx.organizationId), eq(s.tasks.title, 'Llamar a Acme')));
      // El owner reprograma en CT.
      await updateTask(tx, ctx, task!.id, { dueDate: new Date('2027-03-01') });
      // Twenty vuelve a mandar la fecha vieja y un título nuevo.
      const data2 = { ...fixture(), tasks: [{ id: 't1', title: 'Llamar a Acme (act.)', status: 'TODO', dueAt: '2026-12-31T10:00:00Z' }] };
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data2)));
      const [after] = await tx.select().from(s.tasks).where(eq(s.tasks.id, task!.id));
      expect(after!.dueDate).toBe('2027-03-01'); // la fecha de CT prevalece
      expect(after!.title).toBe('Llamar a Acme (act.)'); // el título sí se re-sincroniza
    });
  });

  it('mantiene el aislamiento por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await syncTwenty(tx, sync(a), new TwentyAdapter(new FixtureSource(fixture())));
      const bClients = await tx.select().from(s.clients).where(eq(s.clients.organizationId, b.organizationId));
      expect(bClients).toHaveLength(0);
    });
  });

  // El write-back a Twenty puede fallar (p. ej. Twenty rechaza el valor de `stage`). Si además el pull reescribiera
  // la fila con el dato viejo, el cambio del usuario desaparecería sin dejar rastro — el síntoma que reportó el owner.
  it('el pull NO pisa un cambio local cuyo write-back está pendiente o falló', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      const oppId = (await resolveInternalId(tx, ctx, 'TWENTY', 'opportunity', 'o1'))!;

      // El usuario mueve la oportunidad en CT → queda un `twenty.push` PENDING (aún no ha llegado a Twenty).
      await changeOpportunityStage(tx, ctx, oppId, 'NEGOTIATION');
      const [pending] = await tx
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.organizationId, ctx.organizationId), eq(s.outboxEvents.eventType, 'twenty.push')));
      expect(pending).toBeDefined();
      // Simula que el envío agotó los reintentos (Twenty rechazó el stage).
      await tx
        .update(s.outboxEvents)
        .set({ status: 'FAILED', lastError: 'Twenty: stage no válido' })
        .where(eq(s.outboxEvents.id, pending!.id));

      // El sync trae la oportunidad con el stage VIEJO…
      const summary = await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));

      // …y NO la sobrescribe: el cambio del usuario sigue ahí, y el motivo queda en los saltados del run.
      const [opp] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, oppId));
      expect(opp!.stage).toBe('NEGOTIATION');
      expect(summary.opportunities.updated).toBe(0);
      expect(summary.skipped.map((k) => k.entity)).toContain('opportunity');

      // El fallo es visible y reintentable desde la app.
      const failed = await listFailedOutbox(tx, ctx.organizationId);
      expect(failed).toHaveLength(1);
      expect(failed[0]!.lastError).toContain('stage no válido');
      expect(await retryFailedOutbox(tx, ctx.organizationId, failed[0]!.id)).toBe(true);
      expect(await listFailedOutbox(tx, ctx.organizationId)).toHaveLength(0);
    });
  });

  it('sin push pendiente, el pull sí actualiza (Twenty sigue siendo dueño del stage)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      data.opportunities[0]!.stage = 'NEGOTIATION';
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      const oppId = (await resolveInternalId(tx, ctx, 'TWENTY', 'opportunity', 'o1'))!;
      const [opp] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, oppId));
      expect(opp!.stage).toBe('NEGOTIATION');
    });
  });

  it('descartar un envío fallido lo cierra: deja de avisar y el pull vuelve a actualizar ese registro', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      const oppId = (await resolveInternalId(tx, ctx, 'TWENTY', 'opportunity', 'o1'))!;

      await changeOpportunityStage(tx, ctx, oppId, 'NEGOTIATION');
      const [push] = await tx
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.organizationId, ctx.organizationId), eq(s.outboxEvents.eventType, 'twenty.push')));
      await tx.update(s.outboxEvents).set({ status: 'FAILED', lastError: 'Twenty: stage no válido' }).where(eq(s.outboxEvents.id, push!.id));

      // El owner lo arregla a mano en Twenty y da el envío por cerrado.
      expect(await discardFailedOutbox(tx, ctx.organizationId, push!.id)).toBe(true);
      expect(await listFailedOutbox(tx, ctx.organizationId)).toHaveLength(0); // deja de avisar

      // Y el pull vuelve a mandar sobre esa oportunidad (antes se saltaba para no perder el cambio local).
      data.opportunities[0]!.stage = 'WON';
      const summary = await syncTwenty(tx, sync(ctx), new TwentyAdapter(new FixtureSource(data)));
      expect(summary.opportunities.updated).toBe(1);
      const [opp] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, oppId));
      expect(opp!.stage).toBe('WON');
    });
  });
});
