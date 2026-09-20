import { and, eq, or, gte } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { integrations, jobs, organizations } from '@ct/db/schema';
import { enqueueJob } from '../jobs/index';

/**
 * Ventana anti-reencolado: si ya hay un job de sync de esa integración creado hace menos de esto (en cualquier
 * estado), NO se encola otro. Cubre los REINICIOS del worker el mismo día (el guard en memoria `lastDailySyncDate`
 * se pierde al reiniciar → sin esto, el primer tick tras arrancar re-encolaría todos los syncs del día). 20h < 24h
 * de cadencia, así que no bloquea el sync del día siguiente. La tabla `jobs` es la persistencia (no hace falta migración).
 */
const RECENT_SYNC_WINDOW_MS = 20 * 60 * 60 * 1000;

/**
 * Zona horaria de la organización (organizations.settings.timezone) para anclar el scheduler diario a la hora
 * local del owner. App self-hosted de un solo owner → se toma la primera org; devuelve null si no hay tz configurado.
 */
export async function getPrimaryOrgTimezone(db: Database): Promise<string | null> {
  const [row] = await db.select({ settings: organizations.settings }).from(organizations).limit(1);
  const tz = (row?.settings as { timezone?: string } | null)?.timezone;
  return tz ?? null;
}

/**
 * Scheduler de sincronización (Fase 6 · E-8): encola un job de sync por cada integración **conectada**
 * (cualquier estado salvo DISABLED), de todas las organizaciones. Pensado para el worker (periódico).
 * Deduplica (idempotente ante reinicios): NO encola si ya hay un job de ese tipo para esa org **PENDING**
 * (evita pila si un sync tarda) **o creado en las últimas {@link RECENT_SYNC_WINDOW_MS}** (evita re-encolar el
 * sync del día tras reiniciar el worker). `now` inyectable para tests.
 */
export async function enqueueScheduledSyncs(db: Database, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RECENT_SYNC_WINDOW_MS);
  const rows = await db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      organizationId: integrations.organizationId,
      status: integrations.status,
    })
    .from(integrations);

  let enqueued = 0;
  for (const r of rows) {
    if (r.status === 'DISABLED') continue;
    const jobType = `integration.${r.provider.toLowerCase()}.sync`;
    const [recent] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.jobType, jobType),
          eq(jobs.organizationId, r.organizationId),
          or(eq(jobs.status, 'PENDING'), gte(jobs.createdAt, cutoff)),
        ),
      );
    if (recent) continue;
    await enqueueJob(db, {
      jobType,
      payload: { organizationId: r.organizationId, integrationId: r.id },
      organizationId: r.organizationId,
    });
    enqueued++;
  }
  return enqueued;
}
