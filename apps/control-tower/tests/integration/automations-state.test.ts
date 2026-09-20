import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  isAutomationEnabled,
  setAutomationStatus,
  getAutomationOverrides,
  listAutomations,
  getAutomation,
  runAutomationNow,
  type OrgContext,
} from '@ct/application';

/** Estado (activar/pausar) y «Ejecutar ahora» de las automatizaciones contra PostgreSQL real. */
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
  const slug = `autst-${crypto.randomUUID().slice(0, 8)}`;
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

describe('estado de automatizaciones', () => {
  it('activada por defecto cuando no hay override', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      expect(await isAutomationEnabled(tx, ctx.organizationId, 'sync.notion')).toBe(true);
    });
  });

  it('pausar la desactiva y persiste el override; reactivar la vuelve a activar', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await setAutomationStatus(tx, ctx, 'sync.notion', 'PAUSED');
      expect(await isAutomationEnabled(tx, ctx.organizationId, 'sync.notion')).toBe(false);
      expect(await getAutomationOverrides(tx, ctx.organizationId)).toMatchObject({ 'sync.notion': 'PAUSED' });
      // otra automatización no se ve afectada
      expect(await isAutomationEnabled(tx, ctx.organizationId, 'sync.twenty')).toBe(true);

      await setAutomationStatus(tx, ctx, 'sync.notion', 'ACTIVE');
      expect(await isAutomationEnabled(tx, ctx.organizationId, 'sync.notion')).toBe(true);
    });
  });

  it('el núcleo siempre está activo y no se puede pausar', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      expect(await isAutomationEnabled(tx, ctx.organizationId, 'engine.jobs')).toBe(true);
      await expect(setAutomationStatus(tx, ctx, 'engine.jobs', 'PAUSED')).rejects.toThrow();
    });
  });

  it('listAutomations refleja el estado efectivo (CORE / ACTIVE / PAUSED)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await setAutomationStatus(tx, ctx, 'sweep.inbox_purge', 'PAUSED');
      const rows = await listAutomations(tx, ctx);
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r.status]));
      expect(byKey['engine.jobs']).toBe('CORE');
      expect(byKey['sweep.inbox_purge']).toBe('PAUSED');
      expect(byKey['sync.twenty']).toBe('ACTIVE');
    });
  });

  it('getAutomation devuelve el detalle con estado', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const d = await getAutomation(tx, ctx, 'sync.github');
      expect(d.title).toBe('Sincronización GitHub');
      expect(d.status).toBe('ACTIVE');
      expect(d.provider).toBe('GITHUB');
    });
  });
});

describe('ejecutar automatización ahora', () => {
  it('sync sin integración conectada → NOT_FOUND', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await expect(runAutomationNow(tx, ctx, 'sync.notion')).rejects.toThrow();
    });
  });

  it('sync con integración conectada → encola su job', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await tx.insert(s.integrations).values({
        organizationId: ctx.organizationId,
        provider: 'NOTION',
        status: 'CONFIGURED',
        displayName: 'Notion',
      });
      const res = await runAutomationNow(tx, ctx, 'sync.notion');
      expect(res.kind).toBe('sync');
      const jobs = await tx
        .select()
        .from(s.jobs)
        .where(and(eq(s.jobs.organizationId, ctx.organizationId), eq(s.jobs.jobType, 'integration.notion.sync')));
      expect(jobs).toHaveLength(1);
    });
  });

  it('barrido de bandeja se ejecuta inline y devuelve conteo', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const res = await runAutomationNow(tx, ctx, 'sweep.inbox_purge');
      expect(res.kind).toBe('sweep');
      if (res.kind === 'sweep') expect(typeof res.deleted).toBe('number');
    });
  });

  it('retención sin política → skipped', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const res = await runAutomationNow(tx, ctx, 'sweep.retention');
      expect(res.kind).toBe('sweep');
      if (res.kind === 'sweep') expect(res.skipped).toBe(true);
    });
  });

  it('automatización por evento no es ejecutable → error', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await expect(runAutomationNow(tx, ctx, 'event.opportunity_won')).rejects.toThrow();
    });
  });
});
