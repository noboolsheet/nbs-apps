import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { documents } from '@ct/db/schema';
import type { DocumentSourceAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createDocument } from '../knowledge/index';
import { resolveInternalId, upsertIdentity } from './identity';
import { reconcileMissing } from './reconcile';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de Google Drive → Control Tower. Cada archivo se refleja como un `document`
 * (external_provider=GDRIVE, external_url + mime_type) — metadata/referencia, SIN file store
 * (doc 4 §30 / ERRATA-014). Idempotencia vía `external_identities` (GDRIVE/file→document).
 * Reconcilia borrados: los documentos GDRIVE que ya no aparecen en el pull (borrados/movidos fuera de la
 * carpeta) se **archivan** (M40; antes se borraban sin vuelta atrás, y un pull con un fallo raro se llevaba
 * por delante documentos enlazados a proyectos). Si el fichero vuelve a la carpeta, se restaura solo. El pull
 * es recursivo y sólo trae ficheros (no carpetas).
 */
const P = 'GDRIVE';

export interface SyncDriveSummary {
  files: { created: number; updated: number; archived: number; restored: number };
  skipped: SyncSkip[];
}

export async function syncDrive(
  db: Database,
  ctx: OrgContext,
  adapter: DocumentSourceAdapter,
): Promise<SyncDriveSummary> {
  const { files } = await adapter.pull();
  const summary: SyncDriveSummary = { files: { created: 0, updated: 0, archived: 0, restored: 0 }, skipped: [] };

  // Reconciliación ANTES del bucle. "Vistos" = todos los ficheros del pull (independiente de errores
  // por-fichero, para no archivar uno que simplemente falló al procesarse).
  const recon = await reconcileMissing(db, ctx, {
    provider: P,
    externalType: 'file',
    entityType: 'document',
    seen: new Set(files.map((f) => f.externalId)),
  });
  summary.files.archived = recon.archived;
  summary.files.restored = recon.restored;

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

  return summary;
}
