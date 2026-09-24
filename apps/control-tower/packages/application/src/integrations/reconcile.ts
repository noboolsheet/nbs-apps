import { and, eq, inArray, isNull, isNotNull, ne } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '@ct/db';
import { externalIdentities } from '@ct/db/schema';
import { logger } from '@ct/shared';
import { orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { ARCHIVABLE } from '../maintenance/archive';

/**
 * Reconciliación de borrados (M40): la mitad que le faltaba a los syncs.
 *
 * Hasta M40 los syncs sólo sabían crear y actualizar. Lo que desaparecía en el origen —un repo borrado en
 * GitHub, una oportunidad borrada en Twenty, una página borrada en Notion— se quedaba en Control Tower para
 * siempre, visible y sin manera de saber que ya no existía. Esto cierra el ciclo: lo que el pull deja de
 * devolver se **archiva** (reversible, sale de las listas, aparece en Ajustes › Archivados) y, si vuelve a
 * aparecer en el origen, se **restaura** solo.
 *
 * Se archiva, no se borra, a propósito: un registro puede tener trabajo colgado en CT (una tarea dentro de un
 * proyecto, un activo enlazado) y un pull con un fallo raro no puede destruir datos. La purga por retención ya
 * se encarga del borrado definitivo si el owner lo configura.
 *
 * **Se llama ANTES del bucle de create/update**, con los external_id que vinieron en el pull: así ve el estado
 * de las identidades tal y como quedó del sync anterior (el bucle reescribe `metadata` y limpia `missingSince`).
 *
 * Tres pasadas, en este orden:
 *
 *  1. **Huérfanas** — identidades que apuntan a una fila que ya no existe (registro purgado en CT sin limpiar su
 *     puntero). Son veneno silencioso: el sync resuelve la identidad, hace `UPDATE … WHERE id = <muerto>`, toca
 *     0 filas, cuenta "actualizado" y el registro **no vuelve a aparecer jamás**. Se borran, y así el registro
 *     se re-crea desde el origen en el mismo sync.
 *  2. **Desaparecidas** — identidades cuyo `external_id` no vino en el pull. Se marca `missingSince` y se
 *     archiva la fila. Sólo se archiva en la TRANSICIÓN (cuando `missingSince` estaba a null): si el usuario
 *     restaura a mano algo que el origen sigue sin tener, no se le vuelve a archivar en el siguiente sync.
 *  3. **Reaparecidas** — identidades marcadas que vuelven a venir en el pull: se limpia la marca y se restaura
 *     la fila si estaba archivada.
 *
 * **Guardia del pull vacío:** si el pull no devolvió NADA no se reconcilia nada. Un token revocado, un permiso
 * retirado o un cambio de scope devuelven una lista vacía con HTTP 200, y sin esta guardia el primer sync tras
 * el incidente archivaría el catálogo entero. El precio es que vaciar de verdad el origen no se refleja hasta
 * que quede al menos un registro; es el lado seguro del error y queda avisado en el log.
 */

type ArchivableCols = { id: AnyPgColumn; organizationId: AnyPgColumn; archivedAt: AnyPgColumn };

export interface ReconcileInput {
  /** Proveedor de la identidad (GITHUB, TWENTY, NOTION, GDRIVE). */
  provider: string;
  /** `external_identities.external_type` (repository, company, opportunity, decision…). */
  externalType: string;
  /** Entidad interna afectada; tiene que estar en `ARCHIVABLE` (= `external_identities.internal_type`). */
  entityType: string;
  /** `external_id` de TODO lo que devolvió el pull, incluido lo que luego falló al procesarse. */
  seen: Set<string>;
  /**
   * Notion: no archivar un registro que además tenga identidad de otro proveedor. Allí CT es el que ESCRIBE
   * (espejo), no el que manda: que falte la página de un repo no significa que el repo no exista. De la
   * existencia de ese registro responde su proveedor de origen, que tiene su propia reconciliación.
   */
  onlyIfSoleIdentity?: boolean;
}

export interface ReconcileResult {
  /** Filas archivadas por haber desaparecido del origen. */
  archived: number;
  /** Filas desarchivadas por haber vuelto al origen. */
  restored: number;
  /** Identidades huérfanas eliminadas (apuntaban a filas inexistentes). */
  pruned: number;
}

const EMPTY: ReconcileResult = { archived: 0, restored: 0, pruned: 0 };

export async function reconcileMissing(
  db: Database,
  ctx: OrgContext,
  input: ReconcileInput,
): Promise<ReconcileResult> {
  const log = logger.child({ task: 'reconcile', provider: input.provider, entity: input.entityType });
  const meta = ARCHIVABLE[input.entityType];
  if (!meta) {
    // No debería pasar: hay un test que verifica que todo lo reconciliado es archivable. Si pasa, no se
    // reconcilia (mejor que tumbar el sync entero por una entidad mal declarada).
    log.warn('reconciliación omitida: la entidad no es archivable');
    return { ...EMPTY };
  }
  const cols = meta.table as unknown as ArchivableCols;
  const result: ReconcileResult = { ...EMPTY };

  const identities = await db
    .select({
      id: externalIdentities.id,
      externalId: externalIdentities.externalId,
      internalId: externalIdentities.internalId,
      missingSince: externalIdentities.missingSince,
    })
    .from(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.provider, input.provider),
        eq(externalIdentities.externalType, input.externalType),
      ),
    );
  if (identities.length === 0) return result;

  // --- 1) Identidades huérfanas ---------------------------------------------------------------------
  const alive = (await db
    .select({ id: cols.id })
    .from(meta.table)
    .where(
      and(
        orgEq(cols.organizationId, ctx),
        inArray(
          cols.id,
          identities.map((i) => i.internalId),
        ),
      ),
    )) as { id: string }[];
  const aliveIds = new Set(alive.map((r) => String(r.id)));
  const orphans = identities.filter((i) => !aliveIds.has(i.internalId));
  if (orphans.length > 0) {
    await db.delete(externalIdentities).where(
      inArray(
        externalIdentities.id,
        orphans.map((o) => o.id),
      ),
    );
    result.pruned = orphans.length;
    log.warn('identidades huérfanas eliminadas (apuntaban a filas que ya no existen)', {
      count: orphans.length,
    });
  }

  // --- Guardia del pull vacío -----------------------------------------------------------------------
  if (input.seen.size === 0) {
    log.warn('pull vacío: no se reconcilia nada (posible token/permiso caído)');
    return result;
  }

  const live = identities.filter((i) => aliveIds.has(i.internalId));

  // --- 2) Desaparecidas ------------------------------------------------------------------------------
  const missing = live.filter((i) => !input.seen.has(i.externalId) && i.missingSince === null);
  if (missing.length > 0) {
    const now = new Date();
    await db
      .update(externalIdentities)
      .set({ missingSince: now, updatedAt: now })
      .where(
        inArray(
          externalIdentities.id,
          missing.map((m) => m.id),
        ),
      );

    let archivable = missing.map((m) => m.internalId);
    if (input.onlyIfSoleIdentity) {
      const mirrored = await db
        .select({ internalId: externalIdentities.internalId })
        .from(externalIdentities)
        .where(
          and(
            orgEq(externalIdentities.organizationId, ctx),
            eq(externalIdentities.internalType, input.entityType),
            ne(externalIdentities.provider, input.provider),
            inArray(externalIdentities.internalId, archivable),
          ),
        );
      const elsewhere = new Set(mirrored.map((m) => m.internalId));
      if (elsewhere.size > 0) {
        log.info('registros no archivados: tienen origen en otro proveedor', { count: elsewhere.size });
        archivable = archivable.filter((id) => !elsewhere.has(id));
      }
    }

    if (archivable.length > 0) {
      const rows = (await db
        .update(meta.table)
        .set({ archivedAt: now })
        .where(and(orgEq(cols.organizationId, ctx), inArray(cols.id, archivable), isNull(cols.archivedAt)))
        .returning({ id: cols.id })) as { id: string }[];
      for (const r of rows) {
        await recordAudit(db, ctx, {
          action: 'ARCHIVE',
          entityType: input.entityType,
          entityId: String(r.id),
          metadata: { reason: 'sync-missing', provider: input.provider },
        });
      }
      result.archived = rows.length;
      if (rows.length > 0) log.info('archivados: ya no existen en el origen', { count: rows.length });
    }
  }

  // --- 3) Reaparecidas -------------------------------------------------------------------------------
  const returned = live.filter((i) => input.seen.has(i.externalId) && i.missingSince !== null);
  if (returned.length > 0) {
    await db
      .update(externalIdentities)
      .set({ missingSince: null, updatedAt: new Date() })
      .where(
        inArray(
          externalIdentities.id,
          returned.map((r) => r.id),
        ),
      );
    const rows = (await db
      .update(meta.table)
      .set({ archivedAt: null })
      .where(
        and(
          orgEq(cols.organizationId, ctx),
          inArray(
            cols.id,
            returned.map((r) => r.internalId),
          ),
          isNotNull(cols.archivedAt),
        ),
      )
      .returning({ id: cols.id })) as { id: string }[];
    for (const r of rows) {
      await recordAudit(db, ctx, {
        action: 'RESTORE',
        entityType: input.entityType,
        entityId: String(r.id),
        metadata: { reason: 'sync-returned', provider: input.provider },
      });
    }
    result.restored = rows.length;
    if (rows.length > 0) log.info('restaurados: han vuelto a aparecer en el origen', { count: rows.length });
  }

  return result;
}
