import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { assets } from '@ct/db/schema';
import type { CodeSourceAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createAsset } from '../knowledge/index';
import { resolveInternalId, upsertIdentity } from './identity';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de GitHub → Control Tower. Cada repo se refleja como un `asset`
 * (asset_type=REPOSITORY, external_url + repository_url). El código canónico vive en Git;
 * CT guarda la referencia/metadata. Idempotencia vía `external_identities` (GITHUB/repository).
 */
const P = 'GITHUB';

export interface SyncGitSummary {
  repos: { created: number; updated: number };
  skipped: SyncSkip[];
}

export async function syncGit(db: Database, ctx: OrgContext, adapter: CodeSourceAdapter): Promise<SyncGitSummary> {
  const { repos } = await adapter.pull();
  const summary: SyncGitSummary = { repos: { created: 0, updated: 0 }, skipped: [] };

  for (const repo of repos) {
    try {
      const existing = await resolveInternalId(db, ctx, P, 'repository', repo.externalId);
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
