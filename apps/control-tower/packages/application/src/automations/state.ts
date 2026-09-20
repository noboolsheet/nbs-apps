import { and, desc, eq } from 'drizzle-orm';
import type { Database, DbOrTx } from '@ct/db';
import { jobs, organizations } from '@ct/db/schema';
import type { OrganizationSettings } from '@ct/validation';
import { AppError } from '@ct/shared';
import { orgEq, requireCan, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { AUTOMATION_CATALOG, getAutomationSpec, type AutomationSpec } from './catalog';

/**
 * Estado activada/pausada de las automatizaciones, persistido POR ORGANIZACIÓN en `organizations.settings.automations`
 * (jsonb) — mismo patrón que `completedTaskRetentionDays`/`timezone`. Ausencia de override ⇒ **activada** por defecto.
 * `isAutomationEnabled` es la guarda que consultan el worker y los barridos antes de ejecutar cada automatización.
 */

type AutomationStatus = 'ACTIVE' | 'PAUSED';

/** Lee el mapa de overrides (clave → estado) de una organización. */
export async function getAutomationOverrides(
  db: DbOrTx,
  organizationId: string,
): Promise<Record<string, AutomationStatus>> {
  const [row] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  const map = (row?.settings as OrganizationSettings | null)?.automations;
  return (map as Record<string, AutomationStatus> | null | undefined) ?? {};
}

/**
 * ¿Está activada la automatización `key` para esta organización? Guarda que consultan los handlers/jobs/barridos.
 * Por defecto **activada** (ausente o no pausada). Las del núcleo (no `toggleable`) siempre activas.
 */
export async function isAutomationEnabled(
  db: DbOrTx,
  organizationId: string,
  key: string,
): Promise<boolean> {
  const spec = getAutomationSpec(key);
  if (spec && !spec.toggleable) return true; // núcleo: no se puede desactivar
  const overrides = await getAutomationOverrides(db, organizationId);
  return overrides[key] !== 'PAUSED';
}

/** Estado efectivo de cara a la UI: 'CORE' (núcleo, solo lectura) o 'ACTIVE'/'PAUSED'. */
function effectiveStatus(spec: AutomationSpec, overrides: Record<string, AutomationStatus>): string {
  if (!spec.toggleable) return 'CORE';
  return overrides[spec.key] === 'PAUSED' ? 'PAUSED' : 'ACTIVE';
}

export interface AutomationRow {
  key: string;
  title: string;
  kind: AutomationSpec['kind'];
  frequencyLabel: string;
  status: string; // 'CORE' | 'ACTIVE' | 'PAUSED'
  toggleable: boolean;
  runnable: boolean;
}

/** Filas para la lista de la pestaña Automatizaciones (catálogo + estado efectivo por org). */
export async function listAutomations(db: Database, ctx: OrgContext): Promise<AutomationRow[]> {
  requireCan(ctx.role, 'read');
  const overrides = await getAutomationOverrides(db, ctx.organizationId);
  return AUTOMATION_CATALOG.map((spec) => ({
    key: spec.key,
    title: spec.title,
    kind: spec.kind,
    frequencyLabel: spec.frequencyLabel,
    status: effectiveStatus(spec, overrides),
    toggleable: spec.toggleable,
    runnable: spec.runnable,
  }));
}

export interface AutomationDetail extends AutomationSpec {
  status: string; // 'CORE' | 'ACTIVE' | 'PAUSED'
  lastRunAt: string | null; // sólo sync.* (último job de ese tipo)
  lastRunStatus: string | null;
}

/** Detalle de una automatización para el panel lateral. Incluye última ejecución para las `sync.*`. */
export async function getAutomation(
  db: Database,
  ctx: OrgContext,
  key: string,
): Promise<AutomationDetail> {
  requireCan(ctx.role, 'read');
  const spec = getAutomationSpec(key);
  if (!spec) throw notFound('automation');
  const overrides = await getAutomationOverrides(db, ctx.organizationId);

  let lastRunAt: string | null = null;
  let lastRunStatus: string | null = null;
  if (spec.kind === 'sync' && spec.provider) {
    const jobType = `integration.${spec.provider.toLowerCase()}.sync`;
    const [last] = await db
      .select({ at: jobs.updatedAt, status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.jobType, jobType), orgEq(jobs.organizationId, ctx)))
      .orderBy(desc(jobs.updatedAt))
      .limit(1);
    if (last) {
      lastRunAt = last.at.toISOString();
      lastRunStatus = last.status;
    }
  }

  return { ...spec, status: effectiveStatus(spec, overrides), lastRunAt, lastRunStatus };
}

/**
 * Activa/pausa una automatización para la organización activa. Sólo OWNER (`manage_org`). Fusiona el override en
 * `settings.automations` preservando el resto. Las del núcleo (no `toggleable`) no se pueden tocar.
 */
export async function setAutomationStatus(
  db: Database,
  ctx: OrgContext,
  key: string,
  status: AutomationStatus,
): Promise<{ key: string; status: AutomationStatus }> {
  requireCan(ctx.role, 'manage_org');
  const spec = getAutomationSpec(key);
  if (!spec) throw notFound('automation');
  if (!spec.toggleable) {
    throw new AppError({
      code: 'AUTOMATION_NOT_TOGGLEABLE',
      kind: 'VALIDATION',
      message: `La automatización «${spec.title}» es parte del núcleo y no se puede desactivar`,
    });
  }

  const [current] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId));
  if (!current) throw notFound('organization');

  const settings: OrganizationSettings = { ...((current.settings as OrganizationSettings | null) ?? {}) };
  const automations = { ...(settings.automations ?? {}) };
  automations[key] = status;
  settings.automations = automations;

  try {
    await db
      .update(organizations)
      .set({ settings, updatedAt: new Date() })
      .where(eq(organizations.id, ctx.organizationId));
    await recordAudit(db, ctx, {
      action: 'UPDATE',
      entityType: 'automation',
      metadata: { key, status },
    });
    return { key, status };
  } catch (e) {
    throw mapDbError(e, { entity: 'automation' });
  }
}
