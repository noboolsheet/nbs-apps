import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { assets } from '@ct/db/schema';
import type { CodeSourceAdapter, NormalizedRepo } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createAsset } from '../knowledge/index';
import { resolveInternalId, upsertIdentity } from './identity';
import { reconcileMissing } from './reconcile';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de GitHub → Control Tower. Cada repo se refleja como un `asset`
 * (asset_type=REPOSITORY, external_url + repository_url). El código canónico vive en Git;
 * CT guarda la referencia/metadata. Idempotencia vía `external_identities` (GITHUB/repository).
 *
 * Reconcilia borrados (M40): un repo que ya no viene en el pull se archiva; si vuelve a GitHub, se restaura.
 */
const P = 'GITHUB';

export interface SyncGitSummary {
  repos: { created: number; updated: number; archived: number; restored: number; adopted: number };
  skipped: SyncSkip[];
}

/**
 * Red de seguridad anti-duplicado (M40). Si el repo no tiene identidad GITHUB pero YA existe un asset con su
 * misma URL, se **adopta** ese asset en vez de crear uno nuevo.
 *
 * Por qué hace falta: la idempotencia del sync vive entera en `external_identities`, una tabla local de CT. Si
 * CT arranca con la base vacía (servidor nuevo sin restaurar el dump, `pnpm seed`) mientras Notion y GitHub
 * siguen llenos, el import de Notion crea un asset por cada página y acto seguido el sync de GitHub crea OTRO
 * por cada repo, sin que nada los cruce. Eso es exactamente lo que duplicó los repos en la migración a vibox.
 * La URL del repo es el mismo dato en los dos sitios (las páginas de Notion llevan `Repository URL`), así que
 * sirve de clave natural para re-vincular.
 *
 * Se prefiere el asset vivo más antiguo; si sólo hay archivados, se adopta el archivado (y se deja archivado:
 * desarchivar es decisión del usuario, no del sync).
 */
async function adoptAssetByUrl(db: Database, ctx: OrgContext, repo: NormalizedRepo): Promise<string | null> {
  const urls = [repo.repositoryUrl, repo.url].filter((u): u is string => !!u);
  if (urls.length === 0) return null;
  const matches = or(...urls.flatMap((u) => [eq(assets.repositoryUrl, u), eq(assets.externalUrl, u)]));
  // El asset VIVO más antiguo (el original, no la copia). Si sólo hay archivados se adopta el más antiguo de
  // ellos, sin desarchivarlo: recuperarlo es decisión del usuario.
  const live = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(orgEq(assets.organizationId, ctx), matches, isNull(assets.archivedAt)))
    .orderBy(asc(assets.createdAt))
    .limit(1);
  if (live[0]) return live[0].id;
  const any = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(orgEq(assets.organizationId, ctx), matches))
    .orderBy(asc(assets.createdAt))
    .limit(1);
  return any[0]?.id ?? null;
}

export async function syncGit(db: Database, ctx: OrgContext, adapter: CodeSourceAdapter): Promise<SyncGitSummary> {
  const { repos } = await adapter.pull();
  const summary: SyncGitSummary = {
    repos: { created: 0, updated: 0, archived: 0, restored: 0, adopted: 0 },
    skipped: [],
  };

  // Reconciliación ANTES del bucle: necesita ver las identidades como las dejó el sync anterior.
  const recon = await reconcileMissing(db, ctx, {
    provider: P,
    externalType: 'repository',
    entityType: 'asset',
    seen: new Set(repos.map((r) => r.externalId)),
  });
  summary.repos.archived = recon.archived;
  summary.repos.restored = recon.restored;

  for (const repo of repos) {
    try {
      let existing = await resolveInternalId(db, ctx, P, 'repository', repo.externalId);
      if (!existing) {
        existing = await adoptAssetByUrl(db, ctx, repo);
        if (existing) summary.repos.adopted++;
      }
      if (existing) {
        await db
          .update(assets)
          .set({ name: repo.name, description: repo.description, externalUrl: repo.url, repositoryUrl: repo.repositoryUrl, updatedAt: new Date() })
          .where(and(eq(assets.id, existing), orgEq(assets.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'repository', externalId: repo.externalId, internalType: 'asset', internalId: existing, metadata: { url: repo.url } });
        summary.repos.updated++;
      } else {
        const asset = await createAsset(db, ctx, {
          name: repo.name,
          assetType: 'REPOSITORY',
          description: repo.description,
          status: 'ACTIVE',
          externalUrl: repo.url,
          repositoryUrl: repo.repositoryUrl,
        });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'repository', externalId: repo.externalId, internalType: 'asset', internalId: asset.id, metadata: { url: repo.url } });
        summary.repos.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'repository', externalId: repo.externalId, error: errMsg(e) });
    }
  }

  return summary;
}
