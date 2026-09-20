import { and, eq, count, desc, lt, gte, or, inArray, notInArray, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import {
  clients,
  opportunities,
  tasks,
  deliverables,
  decisions,
  knowledgeInbox,
  projects,
  integrations,
  jobs,
  outboxEvents,
  organizations,
  calendarEvents,
  payments,
} from '@ct/db/schema';
import { ACTIVE_TASK_STATUSES, CLOSED_PROJECT_STATUSES } from '@ct/domain';
import { orgEq, type OrgContext } from '../auth/index';
import { listProjects } from '../projects/index';
import { listRecentAudit } from '../audit/index';
import { resolveEntityNames } from '../maintenance/archive';
import { zonedDayRange } from '../integrations/index';
import { checkDbHealth } from '@ct/db';

/**
 * Context Service para Home (doc 3 §3A.3 / doc old_9 §12). Home es una PROYECCIÓN: todo es
 * derivado de las entidades existentes y cada item enlaza a su fuente. No es fuente de verdad.
 */

export interface AttentionItem {
  kind: string;
  label: string;
  href: string;
  severity: 'high' | 'medium';
}

function todayStr(now: Date, tz?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

async function toCount(query: Promise<{ n: number }[]>): Promise<number> {
  const rows = await query;
  return rows[0]?.n ?? 0;
}

export async function getHomeDashboard(db: Database, ctx: OrgContext) {
  const now = new Date();
  const [orgRow] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId));
  const tz = (orgRow?.settings as { timezone?: string } | null)?.timezone ?? null;
  const today = todayStr(now, tz);
  // Rango del día de hoy en el timezone de la org, para los eventos de calendario (Today's Events).
  const { dayStart, dayEnd } = zonedDayRange(now, tz);
  const timeFmt = new Intl.DateTimeFormat('es-ES', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });

  // Proyectos cerrados/archivados: sus tareas NO cuentan ni aparecen en Home (trabajo terminado). Requiere
  // leftJoin de `projects` en la query. Las personales o de oportunidad no tienen proyecto (projectId NULL) → se conservan.
  const notInClosedProject = or(
    isNull(tasks.projectId),
    and(notInArray(projects.status, [...CLOSED_PROJECT_STATUSES]), isNull(projects.archivedAt)),
  );

  const [
    clientsN,
    projectsActiveN,
    oppsOpenN,
    tasksOpenN,
    decisionsN,
    allProjects,
    todaysWork,
    todaysEventsRaw,
    overdue,
    overdueN,
    deliverablesReview,
    inboxPending,
    decisionsReview,
    recentDecisions,
    paymentsOverdueN,
    integrationsAll,
    jobsPending,
    outboxPending,
    dbHealth,
    recentAudit,
  ] = await Promise.all([
    toCount(db.select({ n: count() }).from(clients).where(orgEq(clients.organizationId, ctx))),
    toCount(db.select({ n: count() }).from(projects).where(and(orgEq(projects.organizationId, ctx), eq(projects.status, 'ACTIVE')))),
    toCount(db.select({ n: count() }).from(opportunities).where(and(orgEq(opportunities.organizationId, ctx), eq(opportunities.status, 'OPEN')))),
    toCount(db.select({ n: count() }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), notInClosedProject))),
    toCount(db.select({ n: count() }).from(decisions).where(orgEq(decisions.organizationId, ctx))),
    listProjects(db, ctx),
    // Today's Work: sólo tareas activas de nivel superior con fecha == hoy (sin subtareas, vencidas ni completadas).
    // Las subtareas solo asoman fuera de su tarea madre cuando están VENCIDAS (bloque Overdue de abajo).
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, projectId: tasks.projectId })
      .from(tasks)
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), eq(tasks.dueDate, today), notInClosedProject))
      .orderBy(tasks.dueDate)
      .limit(10),
    // Today's Events: eventos de calendario SÓLO de hoy (con hora dentro del día en tz de la org, o de día completo).
    db
      .select({ id: calendarEvents.id, title: calendarEvents.title, htmlLink: calendarEvents.htmlLink, startAt: calendarEvents.startAt, isAllDay: calendarEvents.isAllDay, location: calendarEvents.location })
      .from(calendarEvents)
      .where(
        and(
          orgEq(calendarEvents.organizationId, ctx),
          or(
            and(eq(calendarEvents.isAllDay, false), gte(calendarEvents.startAt, dayStart), lt(calendarEvents.startAt, dayEnd)),
            and(eq(calendarEvents.isAllDay, true), eq(calendarEvents.startDate, today)),
          ),
        ),
      )
      .orderBy(calendarEvents.isAllDay, calendarEvents.startAt)
      .limit(30),
    // Overdue: activas con fecha ANTERIOR a hoy (se listan en Home, la más antigua primero) para reprogramar.
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, projectId: tasks.projectId })
      .from(tasks)
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), isNotNull(tasks.dueDate), lt(tasks.dueDate, today), notInClosedProject))
      .orderBy(tasks.dueDate)
      .limit(25),
    // Contador de vencidas (exacto) para el aviso de Attention Required.
    toCount(db.select({ n: count() }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), isNotNull(tasks.dueDate), lt(tasks.dueDate, today), notInClosedProject))),
    toCount(db.select({ n: count() }).from(deliverables).where(and(orgEq(deliverables.organizationId, ctx), eq(deliverables.status, 'REVIEW')))),
    toCount(db.select({ n: count() }).from(knowledgeInbox).where(and(orgEq(knowledgeInbox.organizationId, ctx), inArray(knowledgeInbox.status, ['NEW', 'PROCESSING'])))),
    toCount(db.select({ n: count() }).from(decisions).where(and(orgEq(decisions.organizationId, ctx), eq(decisions.status, 'REVIEW')))),
    db.select({ id: decisions.id, title: decisions.title, status: decisions.status }).from(decisions).where(and(orgEq(decisions.organizationId, ctx), isNull(decisions.archivedAt))).orderBy(desc(decisions.createdAt)).limit(5),
    // Pagos retrasados: pendientes cuya fecha prevista ya pasó (mismo criterio que las tareas vencidas).
    toCount(
      db
        .select({ n: count() })
        .from(payments)
        .where(
          and(
            orgEq(payments.organizationId, ctx),
            isNull(payments.archivedAt),
            eq(payments.status, 'PENDING'),
            isNotNull(payments.dueDate),
            lt(payments.dueDate, today),
          ),
        ),
    ),
    toCount(db.select({ n: count() }).from(integrations).where(orgEq(integrations.organizationId, ctx))),
    toCount(db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'PENDING'))),
    toCount(db.select({ n: count() }).from(outboxEvents).where(eq(outboxEvents.status, 'PENDING'))),
    checkDbHealth(),
    listRecentAudit(db, ctx, 8),
  ]);

  const atRisk = allProjects.filter((p) => p.health === 'AT_RISK');
  const activeProjects = allProjects.filter((p) => p.status === 'ACTIVE').slice(0, 6);

  const todaysEvents = todaysEventsRaw.map((e) => ({
    id: e.id,
    title: e.title ?? '(sin título)',
    href: e.htmlLink ?? null,
    time: e.isAllDay ? 'Todo el día' : e.startAt ? timeFmt.format(e.startAt) : '',
    location: e.location ?? null,
  }));

  // Actividad reciente con NOMBRE de la entidad («Actualizó el proyecto "Web Acme"») y, si el audit guardó un
  // estado/etapa, también el detalle: sin eso la lista decía sólo "Actualizó proyecto" y no informaba de nada.
  const names = await resolveEntityNames(
    db,
    ctx,
    recentAudit.map((a) => ({ entityType: a.entityType, entityId: a.entityId ?? '' })),
  );
  const recentActivity = recentAudit.map((a) => {
    const meta = (a.metadata ?? {}) as Record<string, unknown>;
    const detail = [meta.status, meta.stage, meta.visibility]
      .filter((v): v is string => typeof v === 'string')
      .at(0);
    return {
      action: a.action,
      entityType: a.entityType,
      entityName: a.entityId ? (names.get(`${a.entityType}:${a.entityId}`) ?? null) : null,
      detail: detail ?? null,
      actorType: a.actorType,
      at: a.createdAt,
    };
  });

  const attention: AttentionItem[] = [];
  for (const p of atRisk) {
    attention.push({ kind: 'project_at_risk', label: `Proyecto en riesgo: ${p.name}`, href: `/projects/${p.id}`, severity: 'high' });
  }
  if (overdueN > 0) {
    attention.push({ kind: 'tasks_overdue', label: `${overdueN} tarea(s) vencida(s) — reprograma su fecha`, href: '/tasks', severity: 'high' });
  }
  if (todaysWork.length > 0) {
    attention.push({ kind: 'tasks_due', label: `${todaysWork.length} tarea(s) para hoy`, href: '/tasks', severity: 'medium' });
  }
  if (deliverablesReview > 0) {
    attention.push({ kind: 'deliverables_review', label: `${deliverablesReview} entregable(s) en revisión`, href: '/projects', severity: 'medium' });
  }
  if (inboxPending > 0) {
    attention.push({ kind: 'inbox_pending', label: `${inboxPending} captura(s) por procesar`, href: '/knowledge/inbox', severity: 'medium' });
  }
  if (decisionsReview > 0) {
    attention.push({ kind: 'decisions_review', label: `${decisionsReview} decisión(es) en revisión`, href: '/knowledge/decisions', severity: 'medium' });
  }
  if (paymentsOverdueN > 0) {
    // Alta severidad: un cobro o un pago fuera de plazo cuesta dinero o credibilidad.
    attention.push({
      kind: 'payments_overdue',
      label: `${paymentsOverdueN} pago(s) retrasado(s)`,
      href: '/payments?ver=retrasados',
      severity: 'high',
    });
  }

  return {
    snapshot: {
      clients: clientsN,
      projectsActive: projectsActiveN,
      opportunitiesOpen: oppsOpenN,
      tasksOpen: tasksOpenN,
      decisions: decisionsN,
    },
    today,
    attention,
    activeProjects,
    todaysWork,
    overdue,
    todaysEvents,
    recentDecisions,
    recentActivity,
    inboxPending,
    systemHealth: {
      db: dbHealth.ok,
      dbLatencyMs: dbHealth.latencyMs ?? null,
      integrations: integrationsAll,
      jobsPending,
      outboxPending,
    },
  };
}
