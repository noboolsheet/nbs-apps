import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { externalIdentities } from '@ct/db/schema';
import { ownedFields, PROVIDER_LABEL } from '@ct/domain';
import { orgEq, type OrgContext } from '../auth/index';
import { fieldOwnedExternally } from '../errors';

/**
 * Resolución de identidad externa (doc 5 §25/§39): mapea (provider, external_type, external_id)
 * a un UUID interno. Clave de idempotencia del sync. UNIQUE(provider, external_type, external_id).
 */

export async function resolveInternalId(
  db: Database,
  ctx: OrgContext,
  provider: string,
  externalType: string,
  externalId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ internalId: externalIdentities.internalId })
    .from(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.provider, provider),
        eq(externalIdentities.externalType, externalType),
        eq(externalIdentities.externalId, externalId),
      ),
    );
  return row?.internalId ?? null;
}

export interface ExternalIdentityRef {
  provider: string;
  externalType: string;
  externalId: string;
  internalId: string;
  metadata: unknown;
  lastSyncedAt: Date | null;
}

/** Identidades externas de todas las entidades de un tipo interno (para pintar la fuente en listas sin N+1). */
export async function listIdentitiesByInternalType(
  db: Database,
  ctx: OrgContext,
  internalType: string,
): Promise<ExternalIdentityRef[]> {
  return db
    .select({
      provider: externalIdentities.provider,
      externalType: externalIdentities.externalType,
      externalId: externalIdentities.externalId,
      internalId: externalIdentities.internalId,
      metadata: externalIdentities.metadata,
      lastSyncedAt: externalIdentities.lastSyncedAt,
    })
    .from(externalIdentities)
    .where(and(orgEq(externalIdentities.organizationId, ctx), eq(externalIdentities.internalType, internalType)));
}

/** Identidad externa de una entidad interna concreta (para el detalle: "Open in CRM"). */
export async function getIdentityForInternal(
  db: Database,
  ctx: OrgContext,
  internalType: string,
  internalId: string,
): Promise<ExternalIdentityRef | null> {
  const [row] = await db
    .select({
      provider: externalIdentities.provider,
      externalType: externalIdentities.externalType,
      externalId: externalIdentities.externalId,
      internalId: externalIdentities.internalId,
      metadata: externalIdentities.metadata,
      lastSyncedAt: externalIdentities.lastSyncedAt,
    })
    .from(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.internalType, internalType),
        eq(externalIdentities.internalId, internalId),
      ),
    );
  return row ?? null;
}

/**
 * Guard de inmutabilidad por procedencia: si el registro `(internalType, internalId)` fue importado de un proveedor
 * que POSEE alguno de los campos que se intentan editar (`FIELD_OWNERSHIP`), lanza `fieldOwnedExternally`. Para
 * registros nativos de CT (sin identidad externa) no hace nada. Se usa en los comandos `update*` como defensa en
 * profundidad (el sync no pasa por ellos, así que solo afecta a ediciones de usuario).
 */
export async function assertNotEditingOwnedFields(
  db: Database,
  ctx: OrgContext,
  internalType: string,
  internalId: string,
  incoming: Record<string, unknown>,
): Promise<void> {
  const identity = await getIdentityForInternal(db, ctx, internalType, internalId);
  if (!identity) return;
  const owned = ownedFields(internalType, identity.provider);
  const violated = owned.find((f) => f in incoming && incoming[f] !== undefined);
  if (violated) {
    throw fieldOwnedExternally(violated, PROVIDER_LABEL[identity.provider] ?? identity.provider);
  }
}

/** Identidad externa (external_id + metadata) de una entidad interna en un proveedor concreto (para push). */
export async function getExternalIdentityFor(
  db: Database,
  ctx: OrgContext,
  provider: string,
  internalType: string,
  internalId: string,
): Promise<{ externalId: string; metadata: unknown } | null> {
  const [row] = await db
    .select({ externalId: externalIdentities.externalId, metadata: externalIdentities.metadata })
    .from(externalIdentities)
    .where(
      and(
        orgEq(externalIdentities.organizationId, ctx),
        eq(externalIdentities.provider, provider),
        eq(externalIdentities.internalType, internalType),
        eq(externalIdentities.internalId, internalId),
      ),
    );
  return row ?? null;
}

export async function upsertIdentity(
  db: Database,
  ctx: OrgContext,
  input: {
    provider: string;
    externalType: string;
    externalId: string;
    internalType: string;
    internalId: string;
    metadata?: unknown;
  },
): Promise<void> {
  await db
    .insert(externalIdentities)
    .values({
      organizationId: ctx.organizationId,
      provider: input.provider,
      externalType: input.externalType,
      externalId: input.externalId,
      internalType: input.internalType,
      internalId: input.internalId,
      metadata: (input.metadata as object) ?? null,
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [externalIdentities.provider, externalIdentities.externalType, externalIdentities.externalId],
      set: {
        internalId: input.internalId,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        // Refresca metadata (p. ej. la URL de "Open external"/"Open in CRM") sólo si el sync la aporta.
        ...(input.metadata !== undefined ? { metadata: (input.metadata as object) ?? null } : {}),
      },
    });
}
