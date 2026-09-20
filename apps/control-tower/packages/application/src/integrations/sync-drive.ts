import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { documents, externalIdentities } from '@ct/db/schema';
import type { DocumentSourceAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createDocument } from '../knowledge/index';
import { resolveInternalId, upsertIdentity } from './identity';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de Google Drive → Control Tower. Cada archivo se refleja como un `document`
 * (external_provider=GDRIVE, external_url + mime_type) — metadata/referencia, SIN file store
 * (doc 4 §30 / ERRATA-014). Idempotencia vía `external_identities` (GDRIVE/file→document).
 * Reconcilia borrados: los documentos GDRIVE que ya no aparecen en el pull (borrados/movidos fuera de la
 * carpeta) se eliminan (documento + identidad). El pull es recursivo y sólo trae ficheros (no carpetas).
 */
const P = 'GDRIVE';

export interface SyncDriveSummary {
  files: { created: number; updated: number; deleted: number };
  skipped: SyncSkip[];
}

export async function syncDrive(
  db: Database,
  ctx: OrgContext,
  adapter: DocumentSourceAdapter,
): Promise<SyncDriveSummary> {
  const { files } = await adapter.pull();
  const summary: SyncDriveSummary = { files: { created: 0, updated: 0, deleted: 0 }, skipped: [] };
  // "Vistos" = todos los ficheros del pull (independiente de errores por-fichero, para no borrar uno que falló).
  const seen = new Set(files.map((f) => f.externalId));

  for (const file of files) {
    try {
      const existing = await resolveInternalId(db, ctx, P, 'file', file.externalId);
      if (existing) {
        await db
          .update(documents)
          .set({ name: file.name, mimeType: file.mimeType, externalUrl: file.url, updatedAt: new Date() })
          .where(and(eq(documents.id, existing), orgEq(documents.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'file', externalId: file.externalId, internalType: 'document', internalId: existing, metadata: { url: file.url } });
        summary.files.updated++;
      } else {
        const doc = await createDocument(db, ctx, {
          name: file.name,
          mimeType: file.mimeType,
          externalUrl: file.url,
          externalProvider: P,
          externalId: file.externalId,
          status: 'ACTIVE',
        });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'file', externalId: file.externalId, internalType: 'document', internalId: doc.id, metadata: { url: file.url } });
        summary.files.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'file', externalId: file.externalId, error: errMsg(e) });
    }
  }

  // Reconciliación de borrados: identidades GDRIVE/file de esta org cuyo external_id ya no vino en el pull.
  const identities = await db
    .select({ externalId: externalIdentities.externalId, internalId: externalIdentities.internalId })
    .from(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.provider, P),
        eq(externalIdentities.externalType, 'file'),
      ),
    );
  const stale = identities.filter((i) => !seen.has(i.externalId));
  if (stale.length > 0) {
    const docIds = stale.map((s) => s.internalId);
    const extIds = stale.map((s) => s.externalId);
    await db.delete(documents).where(and(orgEq(documents.organizationId, ctx), inArray(documents.id, docIds)));
    await db
      .delete(externalIdentities)
      .where(
        and(
          orgEq(externalIdentities.organizationId, ctx),
          eq(externalIdentities.provider, P),
          eq(externalIdentities.externalType, 'file'),
          inArray(externalIdentities.externalId, extIds),
        ),
      );
    summary.files.deleted = stale.length;
  }

  return summary;
}
