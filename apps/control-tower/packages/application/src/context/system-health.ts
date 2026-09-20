import { eq, desc, or } from 'drizzle-orm';
import { checkDbHealth, type Database } from '@ct/db';
import { jobs, outboxEvents } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';
import { jobStatusCounts } from '../jobs/index';
import { outboxStatusCounts } from '../outbox/index';
import { listIntegrations } from '../integrations/index';

/** System Health (doc 7 pantalla 25 / doc old_9 §23). Todo derivado. */
export async function getSystemHealth(db: Database, ctx: OrgContext) {
  const [dbHealth, jobCounts, outboxCounts, integrations, recentJobErrors] = await Promise.all([
    checkDbHealth(),
    jobStatusCounts(db),
    outboxStatusCounts(db),
    listIntegrations(db, ctx),
    db
      .select({ id: jobs.id, jobType: jobs.jobType, lastError: jobs.lastError, updatedAt: jobs.updatedAt })
      .from(jobs)
      .where(or(eq(jobs.status, 'FAILED'), eq(jobs.status, 'PENDING')))
      .orderBy(desc(jobs.updatedAt))
      .limit(10),
  ]);

  // Heartbeat del worker: la última vez que un job cambió (proxy; no hay tabla de heartbeat).
  const [lastJob] = await db.select({ updatedAt: jobs.updatedAt }).from(jobs).orderBy(desc(jobs.updatedAt)).limit(1);
  const [pendingOutbox] = await db
    .select({ id: outboxEvents.id })
    .from(outboxEvents)
    .where(orgEq(outboxEvents.organizationId, ctx))
    .limit(1);

  return {
    db: { ok: dbHealth.ok, latencyMs: dbHealth.latencyMs ?? null, error: dbHealth.error ?? null },
    jobs: jobCounts,
    outbox: outboxCounts,
    integrations: integrations.map((i) => ({ id: i.id, provider: i.provider, displayName: i.displayName, status: i.status, lastHealthCheckAt: i.lastHealthCheckAt })),
    worker: { lastJobActivityAt: lastJob?.updatedAt ?? null },
    recentErrors: recentJobErrors.filter((j) => j.lastError).map((j) => ({ jobType: j.jobType, error: j.lastError, at: j.updatedAt })),
    hasPendingOutbox: Boolean(pendingOutbox),
  };
}
