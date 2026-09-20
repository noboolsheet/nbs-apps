import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';

/**
 * M02 — tests de integración del modelo físico contra PostgreSQL real.
 * Cada test corre dentro de una transacción que se revierte (sentinel), así no deja residuos.
 * Verifica: aislamiento por organization_id, unicidad idempotente de external_identities,
 * y los CHECK de enums.
 */
const db = getDb();
const ROLLBACK = new Error('__rollback__');

/** Ejecuta `fn` dentro de una transacción y siempre revierte. */
async function inRollback(fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

async function makeOrg(tx: typeof db, slug: string): Promise<string> {
  const id = crypto.randomUUID();
  await tx.insert(s.organizations).values({ id, name: slug, slug, status: 'ACTIVE' });
  return id;
}

beforeAll(async () => {
  // Falla claro si la DB no está migrada/alcanzable.
  await db.execute(sql`select 1`);
});

afterAll(async () => {
  await closeDb();
});

describe('organization isolation (doc 5 §38)', () => {
  it('una query scoped por organization_id no ve filas de otra org', async () => {
    await inRollback(async (tx) => {
      const orgA = await makeOrg(tx as typeof db, `a-${crypto.randomUUID().slice(0, 8)}`);
      const orgB = await makeOrg(tx as typeof db, `b-${crypto.randomUUID().slice(0, 8)}`);

      await tx.insert(s.clients).values([
        { organizationId: orgA, name: 'Cliente A', slug: `ca-${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
        { organizationId: orgB, name: 'Cliente B', slug: `cb-${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
      ]);

      const rowsA = await tx.select().from(s.clients).where(eq(s.clients.organizationId, orgA));
      expect(rowsA).toHaveLength(1);
      expect(rowsA[0]!.name).toBe('Cliente A');

      const leak = await tx
        .select()
        .from(s.clients)
        .where(and(eq(s.clients.organizationId, orgA), eq(s.clients.name, 'Cliente B')));
      expect(leak).toHaveLength(0);
    });
  });
});

describe('external_identities idempotencia (doc 5 §25/§39)', () => {
  it('rechaza duplicados de (provider, external_type, external_id)', async () => {
    await inRollback(async (tx) => {
      const org = await makeOrg(tx as typeof db, `x-${crypto.randomUUID().slice(0, 8)}`);
      const base = {
        organizationId: org,
        provider: 'TWENTY',
        externalType: 'company',
        externalId: 'abc123',
        internalType: 'client',
        internalId: crypto.randomUUID(),
      };
      await tx.insert(s.externalIdentities).values(base);
      await expect(
        tx.insert(s.externalIdentities).values({ ...base, internalId: crypto.randomUUID() }),
      ).rejects.toThrow();
    });
  });

  it('permite el mismo external_id con distinto provider', async () => {
    await inRollback(async (tx) => {
      const org = await makeOrg(tx as typeof db, `y-${crypto.randomUUID().slice(0, 8)}`);
      await tx.insert(s.externalIdentities).values([
        { organizationId: org, provider: 'TWENTY', externalType: 'company', externalId: 'same', internalType: 'client', internalId: crypto.randomUUID() },
        { organizationId: org, provider: 'NOTION', externalType: 'company', externalId: 'same', internalType: 'client', internalId: crypto.randomUUID() },
      ]);
      const rows = await tx
        .select()
        .from(s.externalIdentities)
        .where(eq(s.externalIdentities.organizationId, org));
      expect(rows).toHaveLength(2);
    });
  });
});

describe('CHECK de enums (doc 5 §36)', () => {
  it('rechaza un status de task fuera del enum', async () => {
    await inRollback(async (tx) => {
      const org = await makeOrg(tx as typeof db, `t-${crypto.randomUUID().slice(0, 8)}`);
      await expect(
        tx.insert(s.tasks).values({
          organizationId: org,
          title: 'bad',
          status: 'NOT_A_STATUS',
          priority: 'HIGH',
        }),
      ).rejects.toThrow();
    });
  });

  it('acepta un status de opportunity válido del pipeline ADR-002', async () => {
    await inRollback(async (tx) => {
      const org = await makeOrg(tx as typeof db, `o-${crypto.randomUUID().slice(0, 8)}`);
      await tx.insert(s.opportunities).values({
        organizationId: org,
        name: 'opp',
        stage: 'NEGOTIATION',
        status: 'OPEN',
      });
      const rows = await tx
        .select()
        .from(s.opportunities)
        .where(eq(s.opportunities.organizationId, org));
      expect(rows[0]!.stage).toBe('NEGOTIATION');
    });
  });
});
