import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createPortfolioItem,
  updatePortfolioItem,
  updatePortfolioItemStatus,
  updatePortfolioItemVisibility,
  listPortfolioItems,
  type OrgContext,
} from '@ct/application';

/** M08 — casos de uso del módulo Portfolio (ADR-001) contra PostgreSQL real. */
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

async function makeOrg(tx: typeof db, role: OrgContext['role'] = 'OWNER'): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `pf-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role });
  return { userId, organizationId, role };
}

async function makeProject(tx: typeof db, ctx: OrgContext) {
  const [p] = await tx
    .insert(s.projects)
    .values({ organizationId: ctx.organizationId, name: 'P', slug: `p-${crypto.randomUUID().slice(0, 8)}`, status: 'PLANNED', priority: 'LOW' })
    .returning();
  return p!;
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('portfolio use cases', () => {
  it('actualiza metadatos del item (nombre/tipo/externalUrl) y valida refs de la org', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await makeProject(tx, ctx);
      const item = await createPortfolioItem(tx, ctx, { name: 'Caso', type: 'Demo', projectId: p.id });
      const updated = await updatePortfolioItem(tx, ctx, item.id, {
        name: 'Caso Acme',
        type: 'CaseStudy',
        externalUrl: 'https://example.com/caso',
        projectId: null,
      });
      expect(updated.name).toBe('Caso Acme');
      expect(updated.type).toBe('CaseStudy');
      expect(updated.externalUrl).toBe('https://example.com/caso');
      expect(updated.projectId).toBeNull();

      await expect(updatePortfolioItem(tx, ctx, item.id, { projectId: crypto.randomUUID() })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  it('crea item con defaults y lo relaciona a un proyecto de la org', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await makeProject(tx, ctx);
      const item = await createPortfolioItem(tx, ctx, { name: 'Caso Acme', type: 'CaseStudy', projectId: p.id });
      expect(item.status).toBe('CANDIDATE');
      expect(item.visibility).toBe('INTERNAL');
      expect(item.projectId).toBe(p.id);
    });
  });

  it('respeta la máquina de estados (ADR-001)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const item = await createPortfolioItem(tx, ctx, { name: 'X', status: 'CANDIDATE' });
      const prep = await updatePortfolioItemStatus(tx, ctx, item.id, 'IN_PREPARATION');
      expect(prep.status).toBe('IN_PREPARATION');
      const pub = await updatePortfolioItemStatus(tx, ctx, item.id, 'PUBLISHED');
      expect(pub.status).toBe('PUBLISHED');
      await expect(updatePortfolioItemStatus(tx, ctx, item.id, 'CANDIDATE')).rejects.toMatchObject({
        code: 'INVALID_TRANSITION',
      });
    });
  });

  it('cambia visibilidad a PUBLISHABLE', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const item = await createPortfolioItem(tx, ctx, { name: 'X' });
      const updated = await updatePortfolioItemVisibility(tx, ctx, item.id, { visibility: 'PUBLISHABLE' });
      expect(updated.visibility).toBe('PUBLISHABLE');
    });
  });

  it('rechaza projectId de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      const pB = await makeProject(tx, b);
      await expect(createPortfolioItem(tx, a, { name: 'X', projectId: pB.id })).rejects.toMatchObject({
        kind: 'NOT_FOUND',
      });
    });
  });

  it('listPortfolioItems filtra por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createPortfolioItem(tx, a, { name: 'A item' });
      await createPortfolioItem(tx, b, { name: 'B item' });
      const listA = await listPortfolioItems(tx, a);
      expect(listA).toHaveLength(1);
      expect(listA[0]!.name).toBe('A item');
    });
  });
});
