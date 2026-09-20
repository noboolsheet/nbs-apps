import { and, eq, asc } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { integrations, calendarEvents } from '@ct/db/schema';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { notFound } from '../errors';

/** Gestión de integraciones configuradas (doc 5 §26). Secretos en env, NUNCA en `configuration`. */

export function listIntegrations(db: Database, ctx: OrgContext) {
  return db
    .select()
    .from(integrations)
    .where(orgEq(integrations.organizationId, ctx))
    .orderBy(asc(integrations.provider));
}

export async function getIntegrationByProvider(db: Database, ctx: OrgContext, provider: string) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(orgEq(integrations.organizationId, ctx), eq(integrations.provider, provider)));
  return row ?? null;
}

/** Crea/actualiza la fila de integración de un provider (idempotente por org+provider). */
export async function connectIntegration(
  db: Database,
  ctx: OrgContext,
  input: { provider: string; displayName: string; configuration?: unknown },
) {
  requireCan(ctx.role, 'write');
  const existing = await getIntegrationByProvider(db, ctx, input.provider);
  if (existing) {
    const [row] = await db
      .update(integrations)
      .set({ displayName: input.displayName, configuration: (input.configuration as object) ?? existing.configuration, status: 'CONFIGURED', updatedAt: new Date() })
      .where(eq(integrations.id, existing.id))
      .returning();
    return row!;
  }
  const [row] = await db
    .insert(integrations)
    .values({
      organizationId: ctx.organizationId,
      provider: input.provider,
      displayName: input.displayName,
      status: 'CONFIGURED',
      configuration: (input.configuration as object) ?? null,
    })
    .returning();
  await recordAudit(db, ctx, { action: 'CONNECT', entityType: 'integration', entityId: row!.id, metadata: { provider: input.provider } });
  return row!;
}

export async function setIntegrationHealth(
  db: Database,
  ctx: OrgContext,
  id: string,
  status: 'CONFIGURED' | 'ACTIVE' | 'ERROR' | 'DISABLED',
) {
  const [row] = await db
    .update(integrations)
    .set({ status, lastHealthCheckAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.id, id), orgEq(integrations.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('integration');
  return row;
}

/**
 * Desconecta una integración: borra su fila (deja de sincronizarse y vuelve a "Disponibles"). Para
 * proveedores cuya caché no tiene otro dueño en CT (GCALENDAR → calendar_events), también la limpia
 * para no dejar datos obsoletos. NO borra external_identities (así un reconnect + re-sync re-vincula).
 */
export async function disconnectIntegration(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'write');
  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), orgEq(integrations.organizationId, ctx)));
  if (!existing) throw notFound('integration');

  if (existing.provider === 'GCALENDAR') {
    await db
      .delete(calendarEvents)
      .where(and(orgEq(calendarEvents.organizationId, ctx), eq(calendarEvents.provider, 'GCALENDAR')));
  }

  await db.delete(integrations).where(eq(integrations.id, existing.id));
  await recordAudit(db, ctx, { action: 'DISCONNECT', entityType: 'integration', entityId: existing.id, metadata: { provider: existing.provider } });
  return { id: existing.id, provider: existing.provider };
}

/**
 * Actualiza la `configuration` (jsonb no sensible) de una integración: p. ej. `folderId` de Drive o el mapa
 * `databases` de Notion. Los SECRETOS NUNCA van aquí (viven en env). Reemplaza la config completa.
 */
export async function updateIntegrationConfiguration(db: Database, ctx: OrgContext, id: string, configuration: unknown) {
  requireCan(ctx.role, 'write');
  const [row] = await db
    .update(integrations)
    .set({ configuration: (configuration as object) ?? null, updatedAt: new Date() })
    .where(and(eq(integrations.id, id), orgEq(integrations.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('integration');
  await recordAudit(db, ctx, { action: 'UPDATE', entityType: 'integration', entityId: id, metadata: { configuration: true } });
  return row;
}
