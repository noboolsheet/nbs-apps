import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  syncGit,
  syncTwenty,
  createAsset,
  purgeArchivedRecords,
  reconcileMissing,
  type OrgContext,
} from '@ct/application';
import {
  GitAdapter,
  TwentyAdapter,
  type GitDataSource,
  type GitRawRepo,
  type TwentyDataSource,
  type TwentyRawRecord,
} from '@ct/integrations';

/**
 * M40 — reconciliación de borrados: lo que desaparece del origen se archiva, lo que vuelve se restaura, y el
 * sync deja de crear duplicados cuando la base de CT arranca vacía (el incidente de la migración a vibox).
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

async function makeOrg(tx: typeof db): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `rc-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

/** Contexto del SYNC: `userId` no-UUID ⇒ actor SYSTEM (no dispara push a Notion/Twenty). */
function systemCtx(ctx: OrgContext): OrgContext {
  return { ...ctx, userId: 'system' };
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

const repo = (id: number, name: string): GitRawRepo => ({
  id,
  name,
  html_url: `https://github.com/x/${name}`,
  clone_url: `https://github.com/x/${name}.git`,
});

class FixtureTwenty implements TwentyDataSource {
  constructor(private data: { companies?: TwentyRawRecord[]; opportunities?: TwentyRawRecord[] }) {}
  async ping() {
    return true;
  }
  async companies() {
    return this.data.companies ?? [];
  }
  async people() {
    return [];
  }
  async opportunities() {
    return this.data.opportunities ?? [];
  }
  async tasks() {
    return [];
  }
  async update() {}
}

async function assetsOf(tx: typeof db, ctx: OrgContext) {
  return tx.select().from(s.assets).where(eq(s.assets.organizationId, ctx.organizationId));
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('reconciliación de borrados (M40)', () => {
  it('GitHub: un repo que desaparece se archiva, y si vuelve se restaura', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      const dos = [repo(1, 'alondra'), repo(2, 'control-tower')];

      await syncGit(tx, ctx, new GitAdapter(new FixtureGit(dos)));
      expect((await assetsOf(tx, ctx)).filter((a) => !a.archivedAt)).toHaveLength(2);

      // 'alondra' se borra de GitHub.
      const uno = await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(2, 'control-tower')])));
      expect(uno.repos.archived).toBe(1);
      const tras = await assetsOf(tx, ctx);
      expect(tras).toHaveLength(2); // no se borra nada: se archiva
      expect(tras.find((a) => a.name === 'alondra')!.archivedAt).not.toBeNull();
      expect(tras.find((a) => a.name === 'control-tower')!.archivedAt).toBeNull();

      // …y vuelve a GitHub.
      const vuelve = await syncGit(tx, ctx, new GitAdapter(new FixtureGit(dos)));
      expect(vuelve.repos.restored).toBe(1);
      expect((await assetsOf(tx, ctx)).find((a) => a.name === 'alondra')!.archivedAt).toBeNull();
    });
  });

  it('GitHub: un pull vacío NO archiva nada (token caído, permiso retirado)', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(1, 'alondra')])));

      const vacio = await syncGit(tx, ctx, new GitAdapter(new FixtureGit([])));
      expect(vacio.repos.archived).toBe(0);
      expect((await assetsOf(tx, ctx))[0]!.archivedAt).toBeNull();
    });
  });

  it('GitHub: adopta el asset que ya existe con la misma URL en vez de duplicarlo', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      // El asset que dejó el import de Notion tras rehacer la base: mismo repo, sin identidad GITHUB.
      await createAsset(tx, ctx, {
        name: 'alondra (desde Notion)',
        assetType: 'REPOSITORY',
        status: 'ACTIVE',
        externalUrl: 'https://github.com/x/alondra',
        repositoryUrl: 'https://github.com/x/alondra.git',
      });

      const sum = await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(1, 'alondra')])));
      expect(sum.repos.adopted).toBe(1);
      expect(sum.repos.created).toBe(0);

      const rows = await assetsOf(tx, ctx);
      expect(rows).toHaveLength(1); // ← el duplicado que provocó el incidente ya no aparece
      expect(rows[0]!.name).toBe('alondra'); // GitHub manda en el nombre
    });
  });

  it('una identidad huérfana se limpia y el registro vuelve a crearse desde el origen', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(1, 'alondra')])));

      // Se borra el asset a mano dejando el puntero colgando (lo que hacía la purga antes de M40).
      await tx.delete(s.assets).where(eq(s.assets.organizationId, ctx.organizationId));

      const sum = await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(1, 'alondra')])));
      expect(sum.repos.created).toBe(1); // antes: 'updated' sobre 0 filas y el repo no volvía jamás
      expect(await assetsOf(tx, ctx)).toHaveLength(1);
    });
  });

  it('Twenty: una oportunidad borrada allí se archiva aquí', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      const data = {
        companies: [{ id: 'c1', name: 'Acme' }],
        opportunities: [
          { id: 'o1', name: 'Acme deal', stage: 'PROPOSAL_SENT', companyId: 'c1' },
          { id: 'o2', name: 'Otra', stage: 'LEAD', companyId: 'c1' },
        ],
      };
      await syncTwenty(tx, ctx, new TwentyAdapter(new FixtureTwenty(data)));
      expect(
        await tx
          .select()
          .from(s.opportunities)
          .where(and(eq(s.opportunities.organizationId, ctx.organizationId), isNull(s.opportunities.archivedAt))),
      ).toHaveLength(2);

      const sum = await syncTwenty(
        tx,
        ctx,
        new TwentyAdapter(new FixtureTwenty({ ...data, opportunities: [data.opportunities[0]!] })),
      );
      expect(sum.opportunities.archived).toBe(1);
      const vivas = await tx
        .select()
        .from(s.opportunities)
        .where(and(eq(s.opportunities.organizationId, ctx.organizationId), isNull(s.opportunities.archivedAt)));
      expect(vivas).toHaveLength(1);
      expect(vivas[0]!.name).toBe('Acme deal');
    });
  });

  it('Notion no archiva un registro cuyo origen es otro proveedor (allí es espejo)', async () => {
    await inRollback(async (tx) => {
      const ctx = systemCtx(await makeOrg(tx));
      await syncGit(tx, ctx, new GitAdapter(new FixtureGit([repo(1, 'alondra')])));
      const asset = (await assetsOf(tx, ctx))[0]!;

      // Su página espejo en Notion, que alguien borra.
      await tx.insert(s.externalIdentities).values({
        organizationId: ctx.organizationId,
        provider: 'NOTION',
        externalType: 'asset',
        externalId: 'page-1',
        internalType: 'asset',
        internalId: asset.id,
      });

      const recon = await reconcileMissing(tx, ctx, {
        provider: 'NOTION',
        externalType: 'asset',
        entityType: 'asset',
        seen: new Set(['otra-pagina']),
        onlyIfSoleIdentity: true,
      });
      expect(recon.archived).toBe(0);
      expect((await assetsOf(tx, ctx))[0]!.archivedAt).toBeNull();
    });
  });

  it('la purga por retención se lleva también la identidad externa', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx); // purgeArchivedRecords requiere rol con permiso delete
      await syncGit(tx, systemCtx(ctx), new GitAdapter(new FixtureGit([repo(1, 'alondra')])));
      const asset = (await assetsOf(tx, ctx))[0]!;

      const hace100dias = new Date(Date.now() - 100 * 86_400_000);
      await tx.update(s.assets).set({ archivedAt: hace100dias }).where(eq(s.assets.id, asset.id));

      const res = await purgeArchivedRecords(tx, ctx, { retentionDays: 30 });
      expect(res.deleted).toBeGreaterThanOrEqual(1);
      const ids = await tx
        .select()
        .from(s.externalIdentities)
        .where(eq(s.externalIdentities.organizationId, ctx.organizationId));
      expect(ids).toHaveLength(0); // antes de M40 quedaba colgando y bloqueaba la re-creación
    });
  });
});
