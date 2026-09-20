import { writeFileSync } from 'node:fs';
import { loadEnv } from '@ct/validation';
import { logger } from '@ct/shared';
import { getDb, closeDb } from '@ct/db';
import {
  processNextJob,
  dispatchOutboxOnce,
  runRetentionSweep,
  runOpportunityArchiveSweep,
  runInboxPurgeSweep,
  runReviewPurgeSweep,
  runArchivedPurgeSweep,
  runSyncRunsPurgeSweep,
  runLogRotationSweep,
  reapStuckJobs,
  reapStuckOutbox,
  enqueueScheduledSyncs,
  getPrimaryOrgTimezone,
  setIntegrationHealth,
  getIntegrationByProvider,
  syncTwenty,
  recordSyncRun,
  toSyncOutcome,
  runNotionSync,
  runNotionEntityPush,
  runTwentyEntityPush,
  createProjectFromWonOpportunity,
  isAutomationEnabled,
  syncGit,
  syncDrive,
  syncCalendar,
  resolveOrgTodayRange,
  type JobRegistry,
  type OutboxRegistry,
  type OrgContext,
} from '@ct/application';
import {
  TwentyAdapter,
  HttpTwentyDataSource,
  HttpNotionDataSource,
  GitAdapter,
  HttpGitHubDataSource,
  DriveAdapter,
  HttpDriveDataSource,
  CalendarAdapter,
  HttpCalendarDataSource,
  makeGoogleTokenProvider,
  type DriveHttpConfig,
  type CalendarHttpConfig,
} from '@ct/integrations';

/**
 * Worker de Control Tower. En cada tick: (1) despacha el Outbox (eventos → handlers), (2) drena la cola de jobs,
 * (3) programa syncs periódicos y (4) barre la retención. `FOR UPDATE SKIP LOCKED` permite varios workers sin colisión.
 * Registra los handlers de sync (Twenty/Notion/GitHub/Drive) y de outbox (notion.push/twenty.push/opportunity.won).
 */
const env = loadEnv();
const db = getDb(env.DATABASE_URL);
const workerId = `worker-${process.pid}`;
const log = logger.child({ service: 'control-tower-worker', workerId });

/**
 * Ejecuta un sync de integración marcando la SALUD en la fila de `integrations`: ACTIVE al terminar bien,
 * ERROR si falla (y re-lanza para que el job registre el fallo/retry). El `integrationId` viene en el payload
 * (lo pone `POST /api/v1/integrations/[id]/sync`). Sin integrationId, sólo ejecuta el sync.
 *
 * `automationKey` es la clave del catálogo (p. ej. `sync.notion`): si el owner ha PAUSADO esa automatización, el
 * job se omite (no-op, sin marcar salud). Ejecutarlo a mano encola igual el job; el owner decide reactivarla.
 */
async function withIntegrationHealth(
  jobType: string,
  automationKey: string,
  payload: unknown,
  run: (ctx: OrgContext) => Promise<unknown>,
): Promise<void> {
  const p = (payload ?? {}) as { organizationId?: string; integrationId?: string };
  if (!p.organizationId) throw new Error(`${jobType}: falta organizationId`);
  if (!(await isAutomationEnabled(db, p.organizationId, automationKey))) {
    log.info(`${jobType}: automatización pausada, se omite`, { automationKey });
    return;
  }
  const ctx: OrgContext = { userId: 'system', organizationId: p.organizationId, role: 'OWNER' };
  // F-16: el provider sale del tipo de job (`integration.<provider>.sync`).
  const provider = (jobType.split('.')[1] ?? 'UNKNOWN').toUpperCase();
  const startedAt = new Date();
  try {
    const summary = await run(ctx);
    if (p.integrationId) await setIntegrationHealth(db, ctx, p.integrationId, 'ACTIVE');
    // F-16: persistir el resultado (contadores + registros saltados) para poder verlo desde la app.
    // No debe tumbar el sync si falla el propio registro.
    try {
      await recordSyncRun(db, ctx, {
        provider,
        jobType,
        integrationId: p.integrationId ?? null,
        startedAt,
        outcome: toSyncOutcome(summary),
      });
    } catch (e) {
      log.warn('no se pudo registrar el sync_run', { jobType, error: e instanceof Error ? e.message : String(e) });
    }
  } catch (error) {
    if (p.integrationId) {
      try {
        await setIntegrationHealth(db, ctx, p.integrationId, 'ERROR');
      } catch {
        /* no enmascarar el error original del sync */
      }
    }
    try {
      await recordSyncRun(db, ctx, {
        provider,
        jobType,
        integrationId: p.integrationId ?? null,
        startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {
      /* no enmascarar el error original del sync */
    }
    throw error;
  }
}

// Registry de jobs. `demo.echo` sirve para verificar la cola end-to-end.
const jobRegistry: JobRegistry = {
  'demo.echo': async (job) => {
    log.info('demo.echo', { payload: job.payload });
  },
  // Sync de Twenty: apunta al Twenty self-hosted. Secretos desde env, nunca en DB.
  'integration.twenty.sync': (job) =>
    withIntegrationHealth('integration.twenty.sync', 'sync.twenty', job.payload, async (ctx) => {
      const baseUrl = process.env.TWENTY_API_URL;
      const apiKey = process.env.TWENTY_API_KEY;
      if (!baseUrl || !apiKey) throw new Error('integration.twenty.sync: faltan TWENTY_API_URL/TWENTY_API_KEY');
      const adapter = new TwentyAdapter(new HttpTwentyDataSource({ baseUrl, apiKey }));
      // TWENTY_CRM_URL = URL del navegador (Tailscale/LAN), para el enlace "Open in CRM" (F-1).
      const summary = await syncTwenty(db, ctx, adapter, { crmBaseUrl: process.env.TWENTY_CRM_URL ?? null });
      log.info('twenty sync done', { summary });
      return summary;
    }),
  // Sync de Notion (Fase 3): sync TIPADO por base de datos según el contrato. Los `database_id` viven en
  // integrations.configuration.databases (no secretos). Piloto: Decisions (bidireccional propiedad-por-campo).
  'integration.notion.sync': (job) =>
    withIntegrationHealth('integration.notion.sync', 'sync.notion', job.payload, async (ctx) => {
      const apiKey = process.env.NOTION_API_KEY;
      if (!apiKey) throw new Error('integration.notion.sync: falta NOTION_API_KEY');
      const ds = new HttpNotionDataSource({ apiKey });
      const integ = await getIntegrationByProvider(db, ctx, 'NOTION');
      const databases = (integ?.configuration as { databases?: Record<string, string> } | null)?.databases ?? {};
      if (Object.keys(databases).length === 0) {
        log.warn('notion sync: sin databases configuradas en integrations.configuration.databases');
      }
      const results = await runNotionSync(db, ctx, ds, databases);
      log.info('notion sync done', { results });
      return results;
    }),
  // Sync de GitHub: repos → assets (referencia/metadata).
  'integration.github.sync': (job) =>
    withIntegrationHealth('integration.github.sync', 'sync.github', job.payload, async (ctx) => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) throw new Error('integration.github.sync: falta GITHUB_TOKEN');
      const adapter = new GitAdapter(new HttpGitHubDataSource({ token, owner: process.env.GITHUB_OWNER }));
      const summary = await syncGit(db, ctx, adapter);
      log.info('github sync done', { summary });
      return summary;
    }),
  // Sync de Google Drive (Fase 4): archivos de una carpeta → documents (referencia, sin file store).
  // Auth por cuenta de servicio (GOOGLE_SA_KEY_B64 = clave JSON en base64); token estático como fallback dev.
  // Scoping: integrations.configuration.folderId.
  'integration.gdrive.sync': (job) =>
    withIntegrationHealth('integration.gdrive.sync', 'sync.gdrive', job.payload, async (ctx) => {
      const integ = await getIntegrationByProvider(db, ctx, 'GDRIVE');
      const folderId = (integ?.configuration as { folderId?: string } | null)?.folderId;

      const saB64 = process.env.GOOGLE_SA_KEY_B64;
      const staticToken = process.env.GOOGLE_DRIVE_TOKEN;
      let config: DriveHttpConfig;
      if (saB64) {
        const key = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));
        const getToken = makeGoogleTokenProvider(key, 'https://www.googleapis.com/auth/drive.readonly');
        config = { getToken, folderId };
      } else if (staticToken) {
        config = { accessToken: staticToken, folderId };
      } else {
        throw new Error('integration.gdrive.sync: falta GOOGLE_SA_KEY_B64 (clave JSON de la service account en base64)');
      }

      const adapter = new DriveAdapter(new HttpDriveDataSource(config));
      const summary = await syncDrive(db, ctx, adapter);
      log.info('gdrive sync done', { summary, folderId });
      return summary;
    }),
  // Sync de Google Calendar: eventos del DÍA de hoy → caché calendar_events (referencia read-only para el Home).
  // Mismo service account que Drive (GOOGLE_SA_KEY_B64), scope calendar.readonly. Calendario en GCAL_CALENDAR_ID
  // (email/ID compartido con la SA). El rango del día se calcula en el timezone de la org.
  'integration.gcalendar.sync': (job) =>
    withIntegrationHealth('integration.gcalendar.sync', 'sync.gcalendar', job.payload, async (ctx) => {
      // GCAL_CALENDAR_ID admite varios calendarios separados por coma (todos compartidos con la SA).
      const calendarIds = (process.env.GCAL_CALENDAR_ID ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (calendarIds.length === 0) throw new Error('integration.gcalendar.sync: falta GCAL_CALENDAR_ID');

      const { dayStart, dayEnd } = await resolveOrgTodayRange(db, ctx);

      const saB64 = process.env.GOOGLE_SA_KEY_B64;
      const staticToken = process.env.GOOGLE_CALENDAR_TOKEN;
      const base = { calendarIds, timeMin: dayStart.toISOString(), timeMax: dayEnd.toISOString() };
      let config: CalendarHttpConfig;
      if (saB64) {
        const key = JSON.parse(Buffer.from(saB64, 'base64').toString('utf8'));
        const getToken = makeGoogleTokenProvider(key, 'https://www.googleapis.com/auth/calendar.readonly');
        config = { ...base, getToken };
      } else if (staticToken) {
        config = { ...base, accessToken: staticToken };
      } else {
        throw new Error('integration.gcalendar.sync: falta GOOGLE_SA_KEY_B64 (clave JSON de la service account en base64)');
      }

      const adapter = new CalendarAdapter(new HttpCalendarDataSource(config));
      const summary = await syncCalendar(db, ctx, adapter);
      log.info('gcalendar sync done', { summary, calendars: calendarIds.length });
      return summary;
    }),
};

// Registry de outbox. `notion.push` empuja a Notion la entidad en tiempo real (Fase 5); el resto se loguea.
const outboxRegistry: OutboxRegistry = {
  'notion.push': async (event, edb) => {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey || !event.organizationId) return;
    if (!(await isAutomationEnabled(edb, event.organizationId, 'event.notion_push'))) return;
    const ctx: OrgContext = { userId: 'system', organizationId: event.organizationId, role: 'OWNER' };
    const integ = await getIntegrationByProvider(edb, ctx, 'NOTION');
    const databases = (integ?.configuration as { databases?: Record<string, string> } | null)?.databases ?? {};
    const ds = new HttpNotionDataSource({ apiKey });
    const res = await runNotionEntityPush(edb, ctx, ds, databases, event.aggregateType, event.aggregateId);
    log.info('notion.push', { entity: event.aggregateType, id: event.aggregateId, res });
  },
  // Write-back a Twenty (E-1): empuja los campos gestionados de la entidad editada. No-op si falta config o identidad.
  'twenty.push': async (event, edb) => {
    const baseUrl = process.env.TWENTY_API_URL;
    const apiKey = process.env.TWENTY_API_KEY;
    if (!baseUrl || !apiKey || !event.organizationId) return;
    if (!(await isAutomationEnabled(edb, event.organizationId, 'event.twenty_push'))) return;
    const ctx: OrgContext = { userId: 'system', organizationId: event.organizationId, role: 'OWNER' };
    const ds = new HttpTwentyDataSource({ baseUrl, apiKey });
    const res = await runTwentyEntityPush(edb, ctx, ds, event.aggregateType, event.aggregateId);
    log.info('twenty.push', { entity: event.aggregateType, id: event.aggregateId, res });
  },
  // Automatización por evento (Fase 6): oportunidad GANADA → crear su proyecto (idempotente).
  'opportunity.won': async (event, edb) => {
    if (!event.organizationId) return;
    if (!(await isAutomationEnabled(edb, event.organizationId, 'event.opportunity_won'))) return;
    const ctx: OrgContext = { userId: 'system', organizationId: event.organizationId, role: 'OWNER' };
    const projectId = await createProjectFromWonOpportunity(edb, ctx, event.aggregateId);
    log.info('opportunity.won → project', { opportunityId: event.aggregateId, projectId });
  },
  '*': async (event) => {
    log.info('outbox event', { eventType: event.eventType, aggregate: `${event.aggregateType}:${event.aggregateId}` });
  },
};

const POLL_INTERVAL_MS = 2000;
const MAX_JOBS_PER_TICK = 25;
// Liveness: el worker escribe un heartbeat al terminar cada tick; el healthcheck de Docker lo lee (observabilidad).
// Un WATCHDOG interno sale con exit(1) si el tick ACTUAL lleva colgado más de STALL_MS → `restart: unless-stopped`
// lo levanta (Compose no reinicia solo por "unhealthy"). Umbral generoso: un tick normal dura segundos; con el
// timeout de fetch (30 s) ninguna operación bloquea indefinidamente, así que >5 min corriendo = realmente wedged.
const HEARTBEAT_FILE = process.env.WORKER_HEARTBEAT_FILE ?? '/tmp/ct-worker-heartbeat';
const STALL_MS = Number(process.env.WORKER_STALL_MS ?? 300_000);
let tickStartedAt = 0;
let watchdog: NodeJS.Timeout | undefined;

function writeHeartbeat(): void {
  try {
    writeFileSync(HEARTBEAT_FILE, String(Date.now()));
  } catch {
    /* best-effort: no romper el tick por el heartbeat */
  }
}
// Scheduler de sync: encola los syncs de las integraciones conectadas UNA VEZ AL DÍA, a SYNC_DAILY_HOUR (0–23,
// por defecto 7 = 7am) en la zona horaria de la org (la que el owner configuró en Ajustes). Fuera de [0,23] = off.
// (Antes era cada 15 min; el owner prefiere 1×/día porque los cambios propios se sincronizan al momento a mano.)
const SYNC_DAILY_HOUR = Number(process.env.SYNC_DAILY_HOUR ?? 7);
const SYNC_TZ_ENV = process.env.SYNC_DAILY_TZ || ''; // opcional; si no, se usa el tz de la org
let schedulerTz = SYNC_TZ_ENV || 'UTC';
let tzFetchedAt = 0;
let lastDailySyncDate = ''; // 'YYYY-MM-DD' (hora local) del último día en que se encolaron los syncs
let lastMaintenanceDate = ''; // 'YYYY-MM-DD' (hora local) del último día en que corrieron los barridos de mantenimiento
let lastReapMs = 0; // epoch (ms) del último reaper de filas colgadas en PROCESSING

/** Fecha y hora locales (en `schedulerTz`) actuales, sin librería de fechas. */
function localDateHour(): { date: string; hour: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: schedulerTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  // en-CA con hour12:false puede dar '24' a medianoche; se normaliza a 0.
  const hour = Number(p.hour) % 24;
  return { date: `${p.year}-${p.month}-${p.day}`, hour };
}
let running = true;
let timer: NodeJS.Timeout | undefined;
let ticking = false;

async function tick(): Promise<void> {
  if (ticking) return;
  ticking = true;
  tickStartedAt = Date.now();
  try {
    const dispatched = await dispatchOutboxOnce(db, outboxRegistry);
    let processed = 0;
    for (let i = 0; i < MAX_JOBS_PER_TICK; i++) {
      const result = await processNextJob(db, jobRegistry, workerId);
      if (result === 'idle') break;
      processed++;
    }
    if (dispatched > 0 || processed > 0) log.debug('tick', { dispatched, processed });

    const nowMs = Date.now();

    // Reaper de filas COLGADAS en PROCESSING (el worker que las reclamó murió sin terminarlas): cada ~60 s.
    // Barato (updates indexados que casi siempre tocan 0 filas) y restart-safe; en el primer tick tras arrancar
    // recupera lo que dejó una instancia caída. Con el timeout de HTTP ningún handler legítimo llega al umbral.
    const REAP_INTERVAL_MS = 60_000;
    if (nowMs - lastReapMs >= REAP_INTERVAL_MS) {
      lastReapMs = nowMs;
      try {
        const [jr, or] = await Promise.all([reapStuckJobs(db), reapStuckOutbox(db)]);
        if (jr.requeued + jr.failed + or.requeued + or.failed > 0) log.info('reaped stuck rows', { jobs: jr, outbox: or });
      } catch (error) {
        log.error('reaper failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Barridos de mantenimiento (retención de tareas, autoarchivado de oportunidades, purga de bandeja procesada):
    // UNA VEZ POR DÍA local (y en el primer tick tras arrancar). Todos son idempotentes y restart-safe (borran/archivan
    // por estado/antigüedad, no por temporizador), así que basta con dispararlos 1×/día. La ventana de 7 días del
    // autoarchivado la impone `closedAt`, no la frecuencia del barrido.
    const maintenanceDate = localDateHour().date;
    if (lastMaintenanceDate !== maintenanceDate) {
      lastMaintenanceDate = maintenanceDate;
      try {
        const swept = await runRetentionSweep(db);
        if (swept.deleted > 0) log.info('retention sweep', swept);
      } catch (error) {
        log.error('retention sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        const arch = await runOpportunityArchiveSweep(db);
        if (arch.archived > 0) log.info('opportunity archive sweep', arch);
      } catch (error) {
        log.error('opportunity archive sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        const purged = await runInboxPurgeSweep(db);
        if (purged.deleted > 0) log.info('inbox purge sweep', purged);
      } catch (error) {
        log.error('inbox purge sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        const reviewed = await runReviewPurgeSweep(db);
        if (reviewed.deleted > 0) log.info('review purge sweep', reviewed);
      } catch (error) {
        log.error('review purge sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        const archived = await runArchivedPurgeSweep(db);
        if (archived.deleted > 0 || archived.skipped > 0) log.info('archived purge sweep', archived);
      } catch (error) {
        log.error('archived purge sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        // F-16: el historial de syncs se recorta (últimos 50 runs por proveedor).
        const runs = await runSyncRunsPurgeSweep(db);
        if (runs.deleted > 0) log.info('sync runs purge sweep', runs);
      } catch (error) {
        log.error('sync runs purge sweep failed', { error: error instanceof Error ? error.message : String(error) });
      }
      try {
        // F-24: si lo terminado supera el umbral, se cierra un lote (procesos y bandeja de salida) y la tabla
        // caliente vuelve a empezar.
        const rot = await runLogRotationSweep(db);
        if (rot.rotated > 0) log.info('log rotation', rot);
      } catch (error) {
        log.error('log rotation failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Sync diario a SYNC_DAILY_HOUR (tz de la org). Se dispara en el primer tick tras cruzar esa hora cada día.
    if (Number.isInteger(SYNC_DAILY_HOUR) && SYNC_DAILY_HOUR >= 0 && SYNC_DAILY_HOUR <= 23) {
      // Refresca el tz de la org (si no viene fijado por env) como mucho cada 15 min.
      if (!SYNC_TZ_ENV && nowMs - tzFetchedAt >= 15 * 60 * 1000) {
        tzFetchedAt = nowMs;
        try {
          const tz = await getPrimaryOrgTimezone(db);
          if (tz) schedulerTz = tz;
        } catch {
          /* mantiene el tz anterior */
        }
      }
      const { date, hour } = localDateHour();
      if (hour >= SYNC_DAILY_HOUR && lastDailySyncDate !== date) {
        lastDailySyncDate = date;
        try {
          const n = await enqueueScheduledSyncs(db);
          if (n > 0) log.info('daily syncs enqueued', { count: n, hour: SYNC_DAILY_HOUR, tz: schedulerTz });
        } catch (error) {
          log.error('sync scheduler failed', { error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  } catch (error) {
    log.error('tick failed', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    ticking = false;
    writeHeartbeat(); // "acabo de completar un tick" → el healthcheck lo ve fresco
  }
}

async function shutdown(signal: string): Promise<void> {
  if (!running) return;
  running = false;
  log.info('shutting down', { signal });
  if (timer) clearInterval(timer);
  if (watchdog) clearInterval(watchdog);
  await closeDb();
  process.exit(0);
}

function main(): void {
  log.info('worker started', { pollIntervalMs: POLL_INTERVAL_MS });
  writeHeartbeat(); // heartbeat inicial para el healthcheck (antes de que termine el primer tick)
  void tick();
  timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
  // Watchdog: si el tick ACTUAL lleva colgado más de STALL_MS, salir para que Docker reinicie el contenedor.
  watchdog = setInterval(() => {
    if (ticking && Date.now() - tickStartedAt > STALL_MS) {
      log.error('worker colgado: el tick lleva demasiado tiempo; saliendo para reiniciar', { stalledMs: Date.now() - tickStartedAt });
      process.exit(1);
    }
  }, 30_000);
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main();
