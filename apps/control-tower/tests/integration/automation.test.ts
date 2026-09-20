import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  enqueueJob,
  processNextJob,
  emitOutbox,
  dispatchOutboxOnce,
  changeProjectStatus,
  createProject,
  createClient,
  createOpportunity,
  changeOpportunityStage,
  createProjectFromWonOpportunity,
  listJobsForExport,
  listRecentJobErrors,
  rotateJobLog,
  rotateOutboxLog,
  listLogArchives,
  getLogArchiveCsv,
  type JobRegistry,
  type OutboxRegistry,
  type OrgContext,
} from '@ct/application';

/**
 * M11 — infraestructura de automatización (jobs + outbox) contra PostgreSQL real.
 * NOTA: no se usa el patrón rollback aquí porque el claim de jobs/outbox abre sus propias
 * transacciones (FOR UPDATE SKIP LOCKED); en su lugar se limpian las filas creadas.
 */
const db = getDb();
const WORKER = 'test-worker';

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

async function makeOrg(): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `auto-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await db.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await db.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}
async function cleanupOrg(ctx: OrgContext) {
  await db.delete(s.outboxEvents).where(eq(s.outboxEvents.organizationId, ctx.organizationId));
  await db.delete(s.auditLogs).where(eq(s.auditLogs.organizationId, ctx.organizationId));
  await db.delete(s.changeEvents).where(eq(s.changeEvents.organizationId, ctx.organizationId));
  await db.delete(s.projects).where(eq(s.projects.organizationId, ctx.organizationId));
  await db.delete(s.opportunities).where(eq(s.opportunities.organizationId, ctx.organizationId));
  await db.delete(s.contacts).where(eq(s.contacts.organizationId, ctx.organizationId));
  await db.delete(s.clients).where(eq(s.clients.organizationId, ctx.organizationId));
  await db.delete(s.organizationMembers).where(eq(s.organizationMembers.organizationId, ctx.organizationId));
  await db.delete(s.users).where(eq(s.users.id, ctx.userId));
  await db.delete(s.organizations).where(eq(s.organizations.id, ctx.organizationId));
}
/** Contexto del SYNC: las oportunidades sólo las crea el sistema (nacen en Twenty). */
const sync = (c: OrgContext): OrgContext => ({ ...c, userId: 'system' });


describe('job queue', () => {
  it('procesa un job con handler → COMPLETED', async () => {
    const ran: string[] = [];
    const registry: JobRegistry = { 'test.ok': async (job) => { ran.push(job.id); } };
    const job = await enqueueJob(db, { jobType: 'test.ok', payload: { x: 1 } });
    try {
      const r = await processNextJob(db, registry, WORKER);
      expect(r).toBe('completed');
      expect(ran).toContain(job.id);
      const [row] = await db.select().from(s.jobs).where(eq(s.jobs.id, job.id));
      expect(row!.status).toBe('COMPLETED');
      expect(row!.attempts).toBe(1);
    } finally {
      await db.delete(s.jobs).where(eq(s.jobs.id, job.id));
    }
  });

  it('reintenta con backoff y agota a FAILED (retryable → failed)', async () => {
    const registry: JobRegistry = { 'test.fail': async () => { throw new Error('boom'); } };
    const job = await enqueueJob(db, { jobType: 'test.fail', maxAttempts: 2, availableAt: new Date(0) });
    try {
      const r1 = await processNextJob(db, registry, WORKER);
      expect(r1).toBe('retry');
      // fuerza disponibilidad inmediata (evita esperar el backoff)
      await db.update(s.jobs).set({ availableAt: new Date(0) }).where(eq(s.jobs.id, job.id));
      const r2 = await processNextJob(db, registry, WORKER);
      expect(r2).toBe('failed');
      const [row] = await db.select().from(s.jobs).where(eq(s.jobs.id, job.id));
      expect(row!.status).toBe('FAILED');
      expect(row!.attempts).toBe(2);
      expect(row!.lastError).toContain('boom');
    } finally {
      await db.delete(s.jobs).where(eq(s.jobs.id, job.id));
    }
  });

  it('no hay handler → falla controlado', async () => {
    const job = await enqueueJob(db, { jobType: 'test.unknown', maxAttempts: 1 });
    try {
      const r = await processNextJob(db, {}, WORKER);
      expect(r).toBe('failed');
    } finally {
      await db.delete(s.jobs).where(eq(s.jobs.id, job.id));
    }
  });

  it('processNextJob idle cuando no hay jobs disponibles', async () => {
    const r = await processNextJob(db, {}, WORKER);
    expect(r).toBe('idle');
  });
});

describe('transactional outbox', () => {
  it('changeProjectStatus emite un outbox event atómico y el dispatcher lo procesa', async () => {
    const ctx = await makeOrg();
    try {
      const p = await createProject(db, ctx, { name: 'Outbox proj' });
      await changeProjectStatus(db, ctx, p.id, 'ACTIVE');

      // Nota: además del outbox de cambio de estado, un proyecto (entidad reflejada) también emite un
      // `notion.push` de espejo en tiempo real vía recordAudit; por eso filtramos por el eventType que probamos.
      const pending = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, p.id), eq(s.outboxEvents.eventType, 'project.status_changed')));
      expect(pending).toHaveLength(1);
      expect(pending[0]!.eventType).toBe('project.status_changed');
      expect(pending[0]!.status).toBe('PENDING');

      const seen: string[] = [];
      const registry: OutboxRegistry = { '*': async (ev) => { seen.push(ev.eventType); } };
      const n = await dispatchOutboxOnce(db, registry);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(seen).toContain('project.status_changed');

      const [after] = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, p.id), eq(s.outboxEvents.eventType, 'project.status_changed')));
      expect(after!.status).toBe('PROCESSED');
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('emitOutbox debe usarse dentro de una transacción (atomicidad)', async () => {
    const ctx = await makeOrg();
    try {
      await db.transaction(async (tx) => {
        await emitOutbox(tx, { organizationId: ctx.organizationId, eventType: 'test.evt', aggregateType: 'x', aggregateId: crypto.randomUUID(), payload: { a: 1 } });
      });
      const rows = await db.select().from(s.outboxEvents).where(eq(s.outboxEvents.organizationId, ctx.organizationId));
      expect(rows).toHaveLength(1);
    } finally {
      await cleanupOrg(ctx);
    }
  });
});

describe('automatización por evento: oportunidad ganada → proyecto (Fase 6)', () => {
  it('ganar una oportunidad emite opportunity.won y el handler crea su proyecto (idempotente)', async () => {
    const ctx = await makeOrg();
    try {
      const client = await createClient(db, ctx, { name: 'Cliente Auto' });
      const opp = await createOpportunity(db, sync(ctx), { name: 'Trato grande', clientId: client.id, stage: 'QUALIFIED' });

      await changeOpportunityStage(db, ctx, opp.id, 'WON');

      // Se emitió el evento de automatización (atómico con el cambio de stage).
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, opp.id), eq(s.outboxEvents.eventType, 'opportunity.won')));
      expect(events).toHaveLength(1);

      // El handler crea el proyecto, hereda cliente y queda enlazado a la oportunidad.
      const registry: OutboxRegistry = {
        'opportunity.won': async (ev, edb) => { await createProjectFromWonOpportunity(edb, ctx, ev.aggregateId); },
      };
      await dispatchOutboxOnce(db, registry);

      const projs = await db.select().from(s.projects).where(eq(s.projects.opportunityId, opp.id));
      expect(projs).toHaveLength(1);
      expect(projs[0]!.clientId).toBe(client.id);
      expect(projs[0]!.name).toBe('Trato grande');

      // Idempotencia: re-ejecutar el handler no crea un segundo proyecto.
      const again = await createProjectFromWonOpportunity(db, ctx, opp.id);
      expect(again).toBe(projs[0]!.id);
      const after = await db.select().from(s.projects).where(eq(s.projects.opportunityId, opp.id));
      expect(after).toHaveLength(1);
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('mover a un stage no ganador NO emite opportunity.won', async () => {
    const ctx = await makeOrg();
    try {
      const client = await createClient(db, ctx, { name: 'Cliente Auto 2' });
      const opp = await createOpportunity(db, sync(ctx), { name: 'Trato', clientId: client.id, stage: 'QUALIFIED' });
      await changeOpportunityStage(db, ctx, opp.id, 'PROPOSAL_SENT');
      const events = await db
        .select()
        .from(s.outboxEvents)
        .where(and(eq(s.outboxEvents.aggregateId, opp.id), eq(s.outboxEvents.eventType, 'opportunity.won')));
      expect(events).toHaveLength(0);
    } finally {
      await cleanupOrg(ctx);
    }
  });

  it('el histórico de procesos incluye los de la org y los globales, con el error de los fallidos', async () => {
    const ctx = await makeOrg();
    try {
      // Job de la organización + job global (los barridos y tareas de sistema no llevan organizationId).
      await enqueueJob(db, { jobType: 'demo.export.org', payload: {}, organizationId: ctx.organizationId });
      await enqueueJob(db, { jobType: 'demo.export.global', payload: {} });

      const rows = await listJobsForExport(db, ctx);
      const types = rows.map((j) => j.jobType);
      expect(types).toContain('demo.export.org');
      expect(types).toContain('demo.export.global'); // los globales también salen en la descarga

      // Un job que agota los intentos aparece en los errores recientes con su motivo.
      const failing: JobRegistry = {
        'demo.export.fail': async () => {
          throw new Error('explota a propósito');
        },
      };
      const [job] = await db
        .select()
        .from(s.jobs)
        .where(and(eq(s.jobs.jobType, 'demo.export.org'), eq(s.jobs.organizationId, ctx.organizationId)));
      await db.update(s.jobs).set({ jobType: 'demo.export.fail', maxAttempts: 1 }).where(eq(s.jobs.id, job!.id));
      await processNextJob(db, failing, WORKER);

      const errors = await listRecentJobErrors(db);
      expect(errors.some((e) => e.error.includes('explota a propósito'))).toBe(true);
    } finally {
      await db.delete(s.jobs).where(eq(s.jobs.jobType, 'demo.export.global'));
      await db.delete(s.jobs).where(eq(s.jobs.organizationId, ctx.organizationId));
      await cleanupOrg(ctx);
    }
  });

  // F-24 — rotación del log de procesos: la tabla `jobs` es el "fichero activo" y al llenarse se cierra un lote.
  it('al superar el umbral se archiva lo TERMINADO y los procesos vivos se quedan', async () => {
    const ctx = await makeOrg();
    const marker = `rot-${crypto.randomUUID().slice(0, 8)}`;
    try {
      // 3 terminados + 1 vivo (PENDING).
      for (let i = 0; i < 3; i++) {
        const j = await enqueueJob(db, { jobType: `${marker}.done`, payload: { i }, organizationId: ctx.organizationId });
        await db.update(s.jobs).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(s.jobs.id, j.id));
      }
      const vivo = await enqueueJob(db, { jobType: `${marker}.pending`, payload: {}, organizationId: ctx.organizationId });

      // Por debajo del umbral no pasa nada.
      expect(await rotateJobLog(db, ctx, { maxRows: 10_000 })).toBeNull();

      const res = await rotateJobLog(db, ctx, { maxRows: 1 });
      expect(res).not.toBeNull();
      expect(res!.seq).toBe(1);
      expect(res!.sizeBytes).toBeGreaterThan(0);

      // Lo terminado desaparece de la tabla caliente; lo vivo NO se toca.
      const quedan = await db.select().from(s.jobs).where(eq(s.jobs.organizationId, ctx.organizationId));
      expect(quedan.map((j) => j.id)).toEqual([vivo.id]);

      // El lote se lista y se descarga con su contenido real.
      const archives = await listLogArchives(db, ctx);
      expect(archives).toHaveLength(1);
      expect(archives[0]!.rowCount).toBeGreaterThanOrEqual(3);
      const { csv } = await getLogArchiveCsv(db, ctx, archives[0]!.id);
      expect(csv).toContain(`${marker}.done`);
      expect(csv).not.toContain(`${marker}.pending`);

      // El siguiente lote es el 2 (numeración incremental = "nombre del fichero").
      await db.update(s.jobs).set({ status: 'COMPLETED' }).where(eq(s.jobs.id, vivo.id));
      const segundo = await rotateJobLog(db, ctx, { maxRows: 1 });
      expect(segundo!.seq).toBe(2);
    } finally {
      await db.delete(s.logArchives).where(eq(s.logArchives.organizationId, ctx.organizationId));
      await db.delete(s.jobs).where(eq(s.jobs.organizationId, ctx.organizationId));
      await cleanupOrg(ctx);
    }
  });

  it('la bandeja de salida rota igual: se archiva lo PROCESADO/FALLIDO y lo pendiente se queda', async () => {
    const ctx = await makeOrg();
    try {
      const mk = async (status: string) => {
        await emitOutbox(db, {
          organizationId: ctx.organizationId,
          eventType: 'demo.rot',
          aggregateType: 'demo',
          aggregateId: crypto.randomUUID(),
          payload: {},
        });
        if (status !== 'PENDING') {
          const [last] = await db
            .select()
            .from(s.outboxEvents)
            .where(and(eq(s.outboxEvents.organizationId, ctx.organizationId), eq(s.outboxEvents.status, 'PENDING')))
            .limit(1);
          await db.update(s.outboxEvents).set({ status }).where(eq(s.outboxEvents.id, last!.id));
        }
      };
      await mk('PROCESSED');
      await mk('FAILED');
      await mk('PENDING');

      expect(await rotateOutboxLog(db, ctx, { maxRows: 10_000 })).toBeNull(); // por debajo del umbral
      const res = await rotateOutboxLog(db, ctx, { maxRows: 1 });
      expect(res!.kind).toBe('OUTBOX');
      expect(res!.rowCount).toBe(2); // el PENDING no se archiva

      const vivos = await db
        .select()
        .from(s.outboxEvents)
        .where(eq(s.outboxEvents.organizationId, ctx.organizationId));
      expect(vivos.map((e) => e.status)).toEqual(['PENDING']);

      // Los dos logs numeran sus lotes por separado.
      const archives = await listLogArchives(db, ctx);
      expect(archives.filter((a) => a.kind === 'OUTBOX').map((a) => a.seq)).toEqual([1]);
      const { csv } = await getLogArchiveCsv(db, ctx, archives[0]!.id);
      expect(csv).toContain('demo.rot');
      expect(csv.split('\n').filter((l) => l.includes('demo.rot'))).toHaveLength(2);
    } finally {
      await db.delete(s.logArchives).where(eq(s.logArchives.organizationId, ctx.organizationId));
      await db.delete(s.outboxEvents).where(eq(s.outboxEvents.organizationId, ctx.organizationId));
      await cleanupOrg(ctx);
    }
  });
});
