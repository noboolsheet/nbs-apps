import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { opportunities } from '@ct/db/schema';
import { opportunityPatch, type TwentyDataSource } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { getExternalIdentityFor } from './identity';

/**
 * Write-back CT → Twenty. **Lo único que Control Tower escribe en Twenty es el `stage` de una oportunidad**
 * (ADR-009, owner 2026-09-26; extiende ADR-008 a todo el CRM): Twenty es el dueño de los registros comerciales y
 * CT gobierna el avance del embudo.
 *
 * Hasta el 2026-09-26 también empujaba cliente (nombre/web/industria), contacto (nombre/email/teléfono/cargo) y la
 * fecha de una task. Se retiró: esos campos ahora están en `FIELD_OWNERSHIP` como propiedad de Twenty, así que CT
 * ni los deja editar ni tiene nada que enviar.
 *
 * Sigue empujando sólo sobre registros que YA vinieron de Twenty (resueltos por `external_identities`): CT no crea
 * nada allí. Se dispara desde el Outbox (`twenty.push`) al editar por un USER; el sync es SYSTEM y no re-empuja,
 * así que no hay bucles.
 */

const P = 'TWENTY';

/** entityType interno → (external_type de identidad, recurso REST de Twenty). */
const TARGETS: Record<string, { externalType: string; resource: string }> = {
  opportunity: { externalType: 'opportunity', resource: 'opportunities' },
};

async function buildBody(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'opportunity') {
    // Sólo el `stage`. Nombre, importe, fecha y cliente se editan en Twenty; empujarlos desde aquí machacaría el
    // original con una copia potencialmente vieja.
    const [r] = await db
      .select({ stage: opportunities.stage })
      .from(opportunities)
      .where(and(eq(opportunities.id, entityId), orgEq(opportunities.organizationId, ctx)));
    return r ? opportunityPatch({ stage: r.stage }) : null;
  }
  return null;
}

/** Empuja una entidad CT a su registro de Twenty. No-op ('skip') si no tiene identidad Twenty o no hay campos. */
export async function runTwentyEntityPush(
  db: Database,
  ctx: OrgContext,
  ds: TwentyDataSource,
  entityType: string,
  entityId: string,
): Promise<'updated' | 'skip'> {
  const target = TARGETS[entityType];
  if (!target) return 'skip';
  const identity = await getExternalIdentityFor(db, ctx, P, entityType, entityId);
  if (!identity) return 'skip'; // creado en CT, no vino de Twenty → no se crea allá
  const body = await buildBody(db, ctx, entityType, entityId);
  if (!body || Object.keys(body).length === 0) return 'skip';
  await ds.update(target.resource, identity.externalId, body);
  return 'updated';
}
