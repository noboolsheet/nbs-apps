import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql, and } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { syncNotionDecisions, createDecision, type OrgContext } from '@ct/application';
import type { NotionDataSource, NotionPage, NotionDatabaseInfo } from '@ct/integrations';

/**
 * Piloto Fase 3 — sync tipado bidireccional de Decisions (Notion) con DataSource fixture (sin Notion real).
 * Verifica: pull-import (Notion→CT), push-create (CT→Notion) e idempotencia. Aislado por rollback.
 */
const db = getDb();
const ROLLBACK = new Error('__rollback__');
const DB_ID = 'db-decisions';

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
  const slug = `nd-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

/** Página en la FORMA de salida de la API (type + plain_text), como la devuelve queryDatabase. */
function notionRow(title: string, status: string, decision: string): NotionPage {
  return {
    id: crypto.randomUUID(),
    url: `https://notion.so/${title.replace(/\s/g, '-')}`,
    properties: {
      Name: { type: 'title', title: [{ plain_text: title }] },
      Status: { type: 'select', select: { name: status } },
      Decision: { type: 'rich_text', rich_text: [{ plain_text: decision }] },
      Context: { type: 'rich_text', rich_text: [] },
      Rationale: { type: 'rich_text', rich_text: [] },
      'Decided at': { type: 'date', date: null },
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
    return { titlePropName: 'Name', propertyTypes: {} };
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

describe('notion decisions sync (fixture, bidireccional)', () => {
  it('importa de Notion las nuevas y empuja las nativas de CT', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      // Una decisión nativa de CT (se debe empujar a Notion) + una en Notion (se debe importar).
      await createDecision(tx, ctx, { title: 'Nativa CT', decision: 'hacer X' });
      const fx = new FixtureNotion([notionRow('Desde Notion', 'DRAFT', 'hacer Y')]);

      const sum = await syncNotionDecisions(tx, ctx, fx, DB_ID);
      expect(sum.imported).toBe(1); // Notion → CT
      expect(sum.pushedCreated).toBe(1); // CT nativa → Notion
      expect(sum.skipped).toHaveLength(0);
      expect(fx.createdCalls).toBe(1);

      // La importada existe en CT con identidad NOTION.
      const [imported] = await tx.select().from(s.decisions).where(and(eq(s.decisions.organizationId, ctx.organizationId), eq(s.decisions.title, 'Desde Notion')));
      expect(imported).toBeTruthy();
      const ids = await tx.select().from(s.externalIdentities).where(and(eq(s.externalIdentities.organizationId, ctx.organizationId), eq(s.externalIdentities.provider, 'NOTION')));
      expect(ids).toHaveLength(2); // ambas decisiones enlazadas
    });
  });

  it('re-sync es idempotente (no re-importa ni re-crea)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createDecision(tx, ctx, { title: 'Nativa CT', decision: 'hacer X' });
      const fx = new FixtureNotion([notionRow('Desde Notion', 'DRAFT', 'hacer Y')]);
      await syncNotionDecisions(tx, ctx, fx, DB_ID);
      const second = await syncNotionDecisions(tx, ctx, fx, DB_ID);
      expect(second.imported).toBe(0);
      expect(second.pushedCreated).toBe(0);
      expect(second.pushedUpdated).toBe(2); // solo actualiza las 2 filas existentes
      const decisions = await tx.select().from(s.decisions).where(eq(s.decisions.organizationId, ctx.organizationId));
      expect(decisions).toHaveLength(2); // sin duplicados
    });
  });
});
