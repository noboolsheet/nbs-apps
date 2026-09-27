import { eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { organizations } from '@ct/db/schema';
import type { OrganizationSettings } from '@ct/validation';
import { AppError } from '@ct/shared';
import { requireCan, type OrgContext } from '../auth/index';
import { notFound } from '../errors';
import { enqueueJob } from '../jobs/index';
import { getIntegrationByProvider } from '../integrations/index';
import { purgeCompletedTasks } from '../projects/index';
import { archiveClosedOpportunities } from '../crm/index';
import { purgeProcessedInbox } from '../knowledge/index';
import { purgeReviewedItems } from '../review/index';
import { archiveTerminalRecords, purgeArchivedRecords } from '../maintenance/archive';
import { OPPORTUNITY_ARCHIVE_AFTER_DAYS } from '../maintenance/retention';
import { getAutomationSpec, type AutomationSpec } from './catalog';
import { recordAutomationRun } from './runs';

/**
 * «Ejecutar ahora» una automatización acotada a la organización activa. Sólo para automatizaciones `runnable`:
 *  - `sync.*`   → encola su job de sincronización (idéntico a «Sincronizar ahora» de Integraciones).
 *  - `sweep.*`  → ejecuta el barrido en el momento (inline), scopeado a la org, y devuelve conteos.
 * Es una acción manual explícita: se permite aunque la automatización esté pausada. Requiere permiso de escritura.
 */
export type RunAutomationResult =
  | { kind: 'sync'; jobId: string; jobType: string }
  | { kind: 'sweep'; sweep: string; deleted?: number; archived?: number; skipped?: boolean; reason?: string };

export async function runAutomationNow(
  db: Database,
  ctx: OrgContext,
  key: string,
): Promise<RunAutomationResult> {
  requireCan(ctx.role, 'write');
  const spec = getAutomationSpec(key);
  if (!spec) throw notFound('automation');
  if (!spec.runnable) {
    throw new AppError({
      code: 'AUTOMATION_NOT_RUNNABLE',
      kind: 'VALIDATION',
      message: `La automatización «${spec.title}» no se puede ejecutar bajo demanda`,
    });
  }

  if (spec.kind === 'sync' && spec.provider) {
    const integ = await getIntegrationByProvider(db, ctx, spec.provider);
    if (!integ) throw notFound('integration');
    const jobType = `integration.${spec.provider.toLowerCase()}.sync`;
    const job = await enqueueJob(db, {
      jobType,
      payload: { organizationId: ctx.organizationId, integrationId: integ.id },
      organizationId: ctx.organizationId,
    });
    return { kind: 'sync', jobId: job.id, jobType: job.jobType };
  }

  if (spec.kind === 'sweep' && spec.sweep) {
    const startedAt = new Date();
    const result = await runSweepInline(db, ctx, spec.sweep);
    // **Huella también cuando se lanza a mano** (E-8): si sólo la dejara el barrido diario, «última ejecución» del
    // panel mentiría justo después de pulsar el botón. Lo que no se anota es un «saltado por falta de política»:
    // no ha pasado nada que contar.
    if (!result.skipped) {
      // Lo que se anota son los CONTADORES, no la envoltura de la respuesta.
      const counts: Record<string, number> = {};
      for (const [k, v] of Object.entries(result)) if (typeof v === 'number') counts[k] = v;
      await recordAutomationRun(db, ctx, { automationKey: key, startedAt, result: counts });
    }
    return result;
  }

  // No debería llegar aquí (runnable ⇒ sync con provider o sweep con tipo).
  throw new AppError({ code: 'AUTOMATION_NOT_RUNNABLE', kind: 'VALIDATION', message: 'Automatización no ejecutable' });
}

/** El barrido en sí, acotado a la organización. Separado para que «Ejecutar ahora» pueda medirlo y anotarlo. */
async function runSweepInline(
  db: Database,
  ctx: OrgContext,
  sweep: NonNullable<AutomationSpec['sweep']>,
): Promise<Extract<RunAutomationResult, { kind: 'sweep' }>> {
  switch (sweep) {
    case 'retention': {
      const [row] = await db
        .select({ settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId));
      const days = (row?.settings as OrganizationSettings | null)?.completedTaskRetentionDays;
      if (typeof days !== 'number' || days <= 0) {
        return { kind: 'sweep', sweep: 'retention', skipped: true, reason: 'Sin política de retención configurada' };
      }
      const res = await purgeCompletedTasks(db, ctx, { retentionDays: days });
      return { kind: 'sweep', sweep: 'retention', deleted: res.deleted };
    }
    case 'opportunity_archive': {
      const res = await archiveClosedOpportunities(db, ctx, { olderThanDays: OPPORTUNITY_ARCHIVE_AFTER_DAYS });
      return { kind: 'sweep', sweep: 'opportunity_archive', archived: res.archived };
    }
    case 'terminal_archive': {
      const res = await archiveTerminalRecords(db, ctx, {});
      return { kind: 'sweep', sweep: 'terminal_archive', archived: res.archived };
    }
    case 'inbox_purge': {
      const res = await purgeProcessedInbox(db, ctx);
      return { kind: 'sweep', sweep: 'inbox_purge', deleted: res.deleted };
    }
    case 'review_purge': {
      const [row] = await db
        .select({ settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId));
      const days = (row?.settings as OrganizationSettings | null)?.reviewRetentionDays;
      if (typeof days !== 'number' || days <= 0) {
        return {
          kind: 'sweep',
          sweep: 'review_purge',
          skipped: true,
          reason: 'Sin política de retención de «Por revisar» configurada (los recursos revisados se conservan)',
        };
      }
      const res = await purgeReviewedItems(db, ctx, { retentionDays: days });
      return { kind: 'sweep', sweep: 'review_purge', deleted: res.deleted };
    }
    case 'archived_purge': {
      const [row] = await db
        .select({ settings: organizations.settings })
        .from(organizations)
        .where(eq(organizations.id, ctx.organizationId));
      const days = (row?.settings as OrganizationSettings | null)?.archivedRetentionDays;
      if (typeof days !== 'number' || days <= 0) {
        return { kind: 'sweep', sweep: 'archived_purge', skipped: true, reason: 'Sin política de retención de archivados configurada' };
      }
      const res = await purgeArchivedRecords(db, ctx, { retentionDays: days });
      return { kind: 'sweep', sweep: 'archived_purge', deleted: res.deleted };
    }
  }
}
