import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql, and } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { runNotionSync, createAsset, type OrgContext } from '@ct/application';
import type { NotionDataSource, NotionPage, NotionDatabaseInfo } from '@ct/integrations';

/** Motor genérico de sync tipado (Fase 3) con fixture — cubre entidad Assets (url/select/text). */
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
  const slug = `ne-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

function assetRow(name: string, type: string, url: string | null): NotionPage {
  return {
    id: crypto.randomUUID(),
    url: `https://notion.so/${name.replace(/\s/g, '-')}`,
    properties: {
      Nome: { type: 'title', title: [{ plain_text: name }] },
      Type: { type: 'rich_text', rich_text: [{ plain_text: type }] },
      Description: { type: 'rich_text', rich_text: [] },
      Status: { type: 'select', select: { name: 'ACTIVE' } },
      Version: { type: 'rich_text', rich_text: [] },
      'External URL': { type: 'url', url },
      'Repository URL': { type: 'url', url: null },
    },
  };
}

class FixtureNotion implements NotionDataSource {
  createdCalls = 0;
  updatedCalls = 0;
  constructor(public store: NotionPage[]) {}
  async ping() {
    return true;
  }
  async retrieveDatabase(): Promise<NotionDatabaseInfo> {
    return { titlePropName: 'Nome', propertyTypes: {} };
  }
  async queryDatabase(): Promise<NotionPage[]> {
    return this.store;
  }
  async createPage(_dbId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    this.createdCalls++;
    const page: NotionPage = { id: crypto.randomUUID(), url: 'https://notion.so/new', properties };
    this.store.push(page);
    return page;
  }
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    this.updatedCalls++;
    const p = this.store.find((x) => x.id === pageId);
    if (p) p.properties = properties;
    return p ?? { id: pageId, url: '', properties };
  }
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('runNotionSync — motor genérico (assets)', () => {
  it('importa asset de Notion y empuja el nativo de CT; re-sync idempotente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createAsset(tx, ctx, { name: 'Asset CT', assetType: 'TEMPLATE', externalUrl: 'https://ct/asset' });
      const fx = new FixtureNotion([assetRow('Asset Notion', 'REPOSITORY', 'https://notion/asset')]);

      const res = await runNotionSync(tx, ctx, fx, { assets: 'db-assets' });
      expect(res.assets.imported).toBe(1);
      expect(res.assets.pushedCreated).toBe(1);
      expect(res.assets.skipped).toHaveLength(0);

      const [imported] = await tx.select().from(s.assets).where(and(eq(s.assets.organizationId, ctx.organizationId), eq(s.assets.name, 'Asset Notion')));
      expect(imported).toBeTruthy();
      const ids = await tx.select().from(s.externalIdentities).where(and(eq(s.externalIdentities.organizationId, ctx.organizationId), eq(s.externalIdentities.provider, 'NOTION'), eq(s.externalIdentities.internalType, 'asset')));
      expect(ids).toHaveLength(2);

      const second = await runNotionSync(tx, ctx, fx, { assets: 'db-assets' });
      expect(second.assets.imported).toBe(0);
      expect(second.assets.pushedCreated).toBe(0);
      expect(second.assets.pushedUpdated).toBe(2);
    });
  });
});
