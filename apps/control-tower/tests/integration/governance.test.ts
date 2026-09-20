import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createService,
  updateService,
  updateServiceStatus,
  listServices,
  createCapability,
  linkServiceCapability,
  getServiceWithCapabilities,
  type OrgContext,
} from '@ct/application';
import { isAppError } from '@ct/shared';

/**
 * M04 — casos de uso del módulo Governance contra PostgreSQL real. Verifica authz por rol,
 * scope de organización, transiciones de estado y el N:M service↔capability.
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

async function makeOrg(tx: typeof db, role: OrgContext['role']): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `g-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role });
  return { userId, organizationId, role };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('governance use cases', () => {
  it('actualiza metadatos de un service (nombre/descripción/tipo)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx, 'OWNER');
      const svc = await createService(tx, ctx, { name: 'Diseño' });
      const updated = await updateService(tx, ctx, svc.id, {
        name: 'Diseño de producto',
        description: 'UX/UI end to end',
        serviceType: 'Consultoría',
      });
      expect(updated.name).toBe('Diseño de producto');
      expect(updated.description).toBe('UX/UI end to end');
      expect(updated.serviceType).toBe('Consultoría');
      expect(updated.status).toBe(svc.status); // el estado no cambia por esta vía
    });
  });

  it('OWNER crea un service con slug derivado y scope de organización', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx, 'OWNER');
      const svc = await createService(tx, ctx, { name: 'Diseño Web' });
      expect(svc.organizationId).toBe(ctx.organizationId);
      expect(svc.slug).toBe('diseno-web');
      expect(svc.status).toBe('IDEA');
    });
  });

  it('VIEWER no puede crear (authz)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx, 'VIEWER');
      await expect(createService(tx, ctx, { name: 'X' })).rejects.toMatchObject({ kind: 'AUTHORIZATION' });
    });
  });

  it('respeta la máquina de estados de service', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx, 'ADMIN');
      const svc = await createService(tx, ctx, { name: 'Svc', status: 'IDEA' });
      const moved = await updateServiceStatus(tx, ctx, svc.id, 'DESIGNING');
      expect(moved.status).toBe('DESIGNING');
      await expect(updateServiceStatus(tx, ctx, svc.id, 'ACTIVE')).rejects.toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    });
  });

  it('listServices sólo devuelve los de la organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx, 'OWNER');
      const b = await makeOrg(tx, 'OWNER');
      await createService(tx, a, { name: 'A only' });
      await createService(tx, b, { name: 'B only' });
      const listA = await listServices(tx, a);
      expect(listA).toHaveLength(1);
      expect(listA[0]!.name).toBe('A only');
    });
  });

  it('vincula capability al service (N:M) y aparece en el detalle', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx, 'OWNER');
      const svc = await createService(tx, ctx, { name: 'Svc' });
      const cap = await createCapability(tx, ctx, { name: 'Cap' });
      await linkServiceCapability(tx, ctx, svc.id, cap.id);
      const detail = await getServiceWithCapabilities(tx, ctx, svc.id);
      expect(detail.capabilities.map((c) => c.id)).toContain(cap.id);
    });
  });

  it('rechaza vincular una capability de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx, 'OWNER');
      const b = await makeOrg(tx, 'OWNER');
      const svc = await createService(tx, a, { name: 'A svc' });
      const capB = await createCapability(tx, b, { name: 'B cap' });
      const err = await linkServiceCapability(tx, a, svc.id, capB.id).catch((e) => e);
      expect(isAppError(err) && err.kind).toBe('NOT_FOUND');
    });
  });
});
