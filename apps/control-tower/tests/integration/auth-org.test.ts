import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { getActiveOrgContext, scopedWhere, assertSameOrg, can, updateProfile } from '@ct/application';

/**
 * M03 — boundary de organización a nivel de capa de aplicación (ADR-003, doc 5 §38).
 * Verifica: resolución de contexto de organización desde organization_members, que una query
 * scoped no ve datos de otra org, y que assertSameOrg bloquea el acceso cross-org.
 * Aislado por transacción con rollback (no deja residuos).
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

async function makeOrgWithUser(tx: typeof db, slug: string, role: string) {
  const orgId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  await tx.insert(s.organizations).values({ id: orgId, name: slug, slug, status: 'ACTIVE' });
  await tx
    .insert(s.users)
    .values({ id: userId, name: slug, email: `${slug}-${crypto.randomUUID().slice(0, 8)}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId: orgId, userId, role });
  return { orgId, userId };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});

afterAll(async () => {
  await closeDb();
});

describe('org context + isolation (ADR-003)', () => {
  it('resuelve el contexto de organización del usuario con su rol', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrgWithUser(tx, `a-${crypto.randomUUID().slice(0, 6)}`, 'OWNER');
      const ctx = await getActiveOrgContext(tx, a.userId);
      expect(ctx).not.toBeNull();
      expect(ctx!.organizationId).toBe(a.orgId);
      expect(ctx!.role).toBe('OWNER');
      expect(can(ctx!.role, 'manage_org')).toBe(true);
    });
  });

  it('devuelve null si el usuario no es miembro de ninguna organización', async () => {
    await inRollback(async (tx) => {
      const orphan = crypto.randomUUID();
      await tx.insert(s.users).values({ id: orphan, name: 'orphan', email: `o-${orphan.slice(0, 8)}@ex.com` });
      const ctx = await getActiveOrgContext(tx, orphan);
      expect(ctx).toBeNull();
    });
  });

  it('una query scoped por el contexto no ve clientes de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrgWithUser(tx, `a-${crypto.randomUUID().slice(0, 6)}`, 'OWNER');
      const b = await makeOrgWithUser(tx, `b-${crypto.randomUUID().slice(0, 6)}`, 'MEMBER');
      await tx.insert(s.clients).values([
        { organizationId: a.orgId, name: 'A client', slug: `ca-${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
        { organizationId: b.orgId, name: 'B client', slug: `cb-${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE' },
      ]);

      const ctxA = (await getActiveOrgContext(tx, a.userId))!;
      const visible = await tx
        .select()
        .from(s.clients)
        .where(scopedWhere(s.clients.organizationId, ctxA));
      expect(visible).toHaveLength(1);
      expect(visible[0]!.name).toBe('A client');
    });
  });

  it('assertSameOrg bloquea el acceso a un recurso de otra org', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrgWithUser(tx, `a-${crypto.randomUUID().slice(0, 6)}`, 'ADMIN');
      const b = await makeOrgWithUser(tx, `b-${crypto.randomUUID().slice(0, 6)}`, 'ADMIN');
      const ctxA = (await getActiveOrgContext(tx, a.userId))!;
      expect(() => assertSameOrg(ctxA, a.orgId)).not.toThrow();
      expect(() => assertSameOrg(ctxA, b.orgId)).toThrow();
    });
  });
});

describe('perfil propio', () => {
  it('actualiza el nombre del usuario de la sesión', async () => {
    await inRollback(async (tx) => {
      const userId = crypto.randomUUID();
      const organizationId = crypto.randomUUID();
      const slug = `pf-${crypto.randomUUID().slice(0, 8)}`;
      await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
      await tx.insert(s.users).values({ id: userId, name: 'Antes', email: `${slug}@ex.com` });
      await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
      const ctx = { userId, organizationId, role: 'OWNER' as const };

      const row = await updateProfile(tx, ctx, { name: 'Después' });
      expect(row.name).toBe('Después');
      expect(row.email).toBe(`${slug}@ex.com`); // intacto
    });
  });

  it('NO permite cambiar el email por esta vía (es la credencial de acceso)', async () => {
    await inRollback(async (tx) => {
      const userId = crypto.randomUUID();
      const organizationId = crypto.randomUUID();
      const slug = `pf-${crypto.randomUUID().slice(0, 8)}`;
      await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
      await tx.insert(s.users).values({ id: userId, name: 'Yo', email: `${slug}@ex.com` });
      await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
      const ctx = { userId, organizationId, role: 'OWNER' as const };

      // El esquema es `.strict()`: mandarlo falla en la validación en vez de ignorarse en silencio.
      await expect(updateProfile(tx, ctx, { email: 'otro@ex.com' })).rejects.toThrow();
      const [row] = await tx.select().from(s.users).where(eq(s.users.id, userId));
      expect(row!.email).toBe(`${slug}@ex.com`);
    });
  });
});
