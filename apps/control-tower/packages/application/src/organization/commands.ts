import { eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { organizations } from '@ct/db/schema';
import { updateOrganizationSchema, type OrganizationSettings } from '@ct/validation';
import { requireCan, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError, notFound } from '../errors';

/**
 * Actualiza la organización activa (Fase 3 · Settings). Sólo OWNER (`manage_org`).
 * `timezone`/`defaultCurrency`/retenciones se fusionan dentro de `settings` (jsonb) preservando otras claves.
 */
export async function updateOrganization(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'manage_org');
  const data = updateOrganizationSchema.parse(input);

  const [current] = await db
    .select({ id: organizations.id, settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId));
  if (!current) throw notFound('organization');

  const nextSettings: OrganizationSettings = { ...((current.settings as OrganizationSettings | null) ?? {}) };
  if ('timezone' in data) nextSettings.timezone = data.timezone ?? null;
  if ('defaultCurrency' in data) nextSettings.defaultCurrency = data.defaultCurrency ?? null;
  if ('completedTaskRetentionDays' in data) {
    // 0 → null (conservar siempre).
    nextSettings.completedTaskRetentionDays = data.completedTaskRetentionDays ? data.completedTaskRetentionDays : null;
  }
  if ('archivedRetentionDays' in data) {
    // 0 → null (conservar siempre).
    nextSettings.archivedRetentionDays = data.archivedRetentionDays ? data.archivedRetentionDays : null;
  }
  if ('reviewRetentionDays' in data) {
    // 0 → null (conservar siempre los recursos ya revisados/descartados).
    nextSettings.reviewRetentionDays = data.reviewRetentionDays ? data.reviewRetentionDays : null;
  }

  try {
    const [row] = await db
      .update(organizations)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        settings: nextSettings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, ctx.organizationId))
      .returning();
    await recordAudit(db, ctx, { action: 'UPDATE', entityType: 'organization', entityId: ctx.organizationId });
    return { ...row!, settings: (row!.settings as OrganizationSettings | null) ?? {} };
  } catch (e) {
    throw mapDbError(e, { entity: 'organization' });
  }
}
