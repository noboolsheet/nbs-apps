import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { syncGit, type OrgContext } from '@ct/application';
import { GitAdapter, type GitDataSource, type GitRawRepo } from '@ct/integrations';

/** M14 — sync idempotente de GitHub con DataSource fixture (sin GitHub real). */
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
  const slug = `gi-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

class FixtureGit implements GitDataSource {
  constructor(private data: GitRawRepo[]) {}
  async ping() {
    return true;
  }
  async repos() {
    return this.data;
  }
}

function fixture(): GitRawRepo[] {
  return [
    { id: 1, name: 'piserver_config', description: 'infra', html_url: 'https://github.com/x/piserver_config', clone_url: 'https://github.com/x/piserver_config.git' },
    { id: 2, name: 'control-tower', html_url: 'https://github.com/x/control-tower', clone_url: 'https://github.com/x/control-tower.git' },
  ];
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('git sync (fixture)', () => {
  it('crea assets REPOSITORY con URLs', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const summary = await syncGit(tx, ctx, new GitAdapter(new FixtureGit(fixture())));
      expect(summary.repos.created).toBe(2);
      const rows = await tx.select().from(s.assets).where(eq(s.assets.organizationId, ctx.organizationId));
      expect(rows).toHaveLength(2);
      const ct = rows.find((a) => a.name === 'control-tower')!;
      expect(ct.assetType).toBe('REPOSITORY');
      expect(ct.status).toBe('ACTIVE');
      expect(ct.repositoryUrl).toBe('https://github.com/x/control-tower.git');
    });
  });

  it('re-ejecutar es idempotente (actualiza, no duplica)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncGit(tx, ctx, new GitAdapter(new FixtureGit(data)));
      data[1]!.description = 'Business OS';
      const second = await syncGit(tx, ctx, new GitAdapter(new FixtureGit(data)));
      expect(second.repos.created).toBe(0);
      expect(second.repos.updated).toBe(2);
      const rows = await tx.select().from(s.assets).where(eq(s.assets.organizationId, ctx.organizationId));
      expect(rows).toHaveLength(2);
      expect(rows.find((a) => a.name === 'control-tower')!.description).toBe('Business OS');
    });
  });
});
