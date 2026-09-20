import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { createAsset, updateAsset, upsertIdentity, type OrgContext } from '@ct/application';

/** Inmutabilidad por procedencia: campos propiedad de un sistema externo no se editan en un registro importado. */
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
  const slug = `own-${crypto.randomUUID().slice(0, 8)}`;
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

describe('inmutabilidad por procedencia', () => {
  it('un asset importado de GitHub rechaza editar repositoryUrl/externalUrl/name', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const asset = await createAsset(tx, ctx, { name: 'repo', assetType: 'REPOSITORY', repositoryUrl: 'https://github.com/o/r.git' });
      await upsertIdentity(tx, ctx, {
        provider: 'GITHUB',
        externalType: 'repository',
        externalId: 'gh-123',
        internalType: 'asset',
        internalId: asset.id,
        metadata: { url: 'https://github.com/o/r' },
      });
      await expect(updateAsset(tx, ctx, asset.id, { repositoryUrl: 'https://evil.example/x' })).rejects.toMatchObject({
        code: 'FIELD_OWNED_EXTERNALLY',
      });
      await expect(updateAsset(tx, ctx, asset.id, { name: 'renombrado' })).rejects.toMatchObject({
        code: 'FIELD_OWNED_EXTERNALLY',
      });
    });
  });

  it('un asset de GitHub SÍ permite editar campos que CT posee (version)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const asset = await createAsset(tx, ctx, { name: 'repo', assetType: 'REPOSITORY' });
      await upsertIdentity(tx, ctx, {
        provider: 'GITHUB',
        externalType: 'repository',
        externalId: 'gh-456',
        internalType: 'asset',
        internalId: asset.id,
      });
      const updated = await updateAsset(tx, ctx, asset.id, { version: 'v2' });
      expect(updated.version).toBe('v2');
    });
  });

  it('un asset NATIVO (sin identidad externa) permite editar repositoryUrl', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const asset = await createAsset(tx, ctx, { name: 'plantilla', assetType: 'TEMPLATE' });
      const updated = await updateAsset(tx, ctx, asset.id, { repositoryUrl: 'https://github.com/mine/repo' });
      expect(updated.repositoryUrl).toBe('https://github.com/mine/repo');
    });
  });
});
