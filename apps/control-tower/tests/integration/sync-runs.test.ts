import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  recordSyncRun,
  toSyncOutcome,
  listSyncRuns,
  latestSyncRunByProvider,
  purgeOldSyncRuns,
  type OrgContext,
} from '@ct/application';

/** F-16 — historial de ejecuciones de sync (persistencia de los registros saltados). */
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
  const slug = `sr-${crypto.randomUUID().slice(0, 8)}`;
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

describe('sync runs (F-16)', () => {
  it('normaliza el summary de cualquier sync a contadores + skips', () => {
    // Forma real de syncTwenty: secciones anidadas con created/updated y una lista de skips.
    const outcome = toSyncOutcome({
      companies: { created: 2, updated: 1 },
      people: { created: 0, updated: 3 },
      skipped: [{ entity: 'company', externalId: 'c1', error: 'boom' }],
    });
    expect(outcome.created).toBe(2);
    expect(outcome.updated).toBe(4);
    expect(outcome.skipped).toHaveLength(1);

    // Forma de runNotionSync: array de resultados por entidad, cada uno con sus propios skips.
    const notion = toSyncOutcome([
      { imported: 2, pushedCreated: 1, pushedUpdated: 0, skipped: [] },
      { imported: 0, pushedCreated: 0, pushedUpdated: 2, skipped: [{ entity: 'decision(ct)', externalId: 'x', error: 'e' }] },
    ]);
    expect(notion.created).toBe(1);
    expect(notion.updated).toBe(4); // imported(2+0) + pushedUpdated(0+2)
    expect(notion.skipped).toHaveLength(1);
  });

  it('un run con skips queda COMPLETED_WITH_WARNINGS y guarda el motivo', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await recordSyncRun(tx, ctx, {
        provider: 'TWENTY',
        jobType: 'integration.twenty.sync',
        startedAt: new Date(),
        outcome: { created: 1, updated: 0, skipped: [{ entity: 'person', externalId: 'p1', error: 'email inválido' }] },
      });
      const [run] = await listSyncRuns(tx, ctx);
      expect(run!.status).toBe('COMPLETED_WITH_WARNINGS');
      expect(run!.skippedCount).toBe(1);
      expect((run!.skips as { error: string }[])[0]!.error).toBe('email inválido');
    });
  });

  it('un run fallido queda FAILED con su error, y el último por proveedor es el más reciente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await recordSyncRun(tx, ctx, {
        provider: 'GITHUB',
        jobType: 'integration.github.sync',
        startedAt: new Date(Date.now() - 60_000),
        outcome: { created: 5 },
      });
      await recordSyncRun(tx, ctx, {
        provider: 'GITHUB',
        jobType: 'integration.github.sync',
        startedAt: new Date(),
        error: 'HTTP 401',
      });
      const latest = await latestSyncRunByProvider(tx, ctx);
      expect(latest.get('GITHUB')!.status).toBe('FAILED');
      expect(latest.get('GITHUB')!.error).toBe('HTTP 401');
    });
  });

  it('la purga conserva los N más recientes por proveedor', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      for (let i = 0; i < 5; i++) {
        await recordSyncRun(tx, ctx, {
          provider: 'GDRIVE',
          jobType: 'integration.gdrive.sync',
          startedAt: new Date(Date.now() - i * 60_000),
          outcome: { created: i },
        });
      }
      const purged = await purgeOldSyncRuns(tx, ctx, { keepPerProvider: 2 });
      expect(purged.deleted).toBe(3);
      expect(await listSyncRuns(tx, ctx)).toHaveLength(2);
    });
  });
});
