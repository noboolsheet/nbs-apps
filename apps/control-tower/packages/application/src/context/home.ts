import { and, eq, count, sum, desc, lt, lte, gt, gte, or, inArray, notInArray, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '@ct/db';
import {
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
 *
 * **Criterio de la vista (owner 2026-09-27):** un dato sólo está en Inicio si (a) pide una acción, (b) es una señal
 * de salud, y (c) **no está ya desplegado más abajo en la misma página**. Antes se incumplía lo tercero de forma
 * sistemática: la misma cosa aparecía como contador, como alerta de «Requiere atención» y como lista completa —
 * tareas vencidas, tareas de hoy, decisiones y proyectos, las cuatro—. Ahora cada dato vive en UN sitio:
 *  · lo que tiene lista en Home (tareas, proyectos, decisiones en revisión) **no** tiene contador ni alerta;
 *  · lo que NO tiene lista (carga de tareas abiertas, embudo, capturas) es un contador;
 *  · «Requiere atención» se queda sólo con lo que no aparece en ningún otro bloque.
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

  // Ventana de «lo que viene»: de mañana a +7 días. Home mostraba sólo vencidas y HOY, así que una tarea para
  // mañana —o sin fecha— era invisible desde aquí, que es la mejor forma de olvidarse de algo (owner 2026-09-27).
  const weekEnd = new Date(`${today}T00:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [
    oppsOpenN,
    tasksOpenN,
    allProjects,
    todaysWork,
    upcoming,
    tasksNoDueN,
    todaysEventsRaw,
    overdue,
    overdueN,
    deliverablesReview,
    inboxPending,
    decisionsInReview,
    wonWithoutProject,
    paymentsPending,
    paymentsOverdue,
    integrationsAll,
    jobsPending,
    outboxPending,
    dbHealth,
    recentAudit,
  ] = await Promise.all([
    toCount(db.select({ n: count() }).from(opportunities).where(and(orgEq(opportunities.organizationId, ctx), eq(opportunities.status, 'OPEN')))),
    toCount(db.select({ n: count() }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).where(and(orgEq(tasks.organizationId, ctx), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), notInClosedProject))),
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
    // Próximos 7 días (de mañana en adelante): lo que viene, que antes no se veía hasta el día mismo.
    db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, projectId: tasks.projectId })
      .from(tasks)
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), gt(tasks.dueDate, today), lte(tasks.dueDate, weekEndStr), notInClosedProject))
      .orderBy(tasks.dueDate)
      .limit(10),
    // Tareas activas SIN fecha: no se listan (serían un cajón de sastre), pero se dice cuántas hay y se enlaza.
    toCount(
      db
        .select({ n: count() })
        .from(tasks)
        .leftJoin(projects, eq(projects.id, tasks.projectId))
        .where(and(orgEq(tasks.organizationId, ctx), isNull(tasks.archivedAt), isNull(tasks.parentTaskId), inArray(tasks.status, [...ACTIVE_TASK_STATUSES]), isNull(tasks.dueDate), notInClosedProject)),
    ),
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
    // Decisiones EN REVISIÓN, no «las últimas»: una decisión ya aprobada es lectura y su sitio es su sección; lo que
    // pide algo de ti es lo que está esperando que la cierres (owner 2026-09-27).
    db
      .select({ id: decisions.id, title: decisions.title, status: decisions.status, createdAt: decisions.createdAt })
      .from(decisions)
      .where(and(orgEq(decisions.organizationId, ctx), isNull(decisions.archivedAt), eq(decisions.status, 'REVIEW')))
      .orderBy(desc(decisions.createdAt))
      .limit(5),
    // Ganadas SIN proyecto: desde que la automatización del ganado está suspendida (el owner confirma cada vez),
    // este estado es normal y hay que PROPONERLO aquí; si no, una oportunidad ganada se queda sin proyecto y sin
    // que nada lo diga hasta que alguien entra en su ficha.
    db
      .select({ id: opportunities.id, name: opportunities.name })
      .from(opportunities)
      .leftJoin(projects, eq(projects.opportunityId, opportunities.id))
      .where(
        and(
          orgEq(opportunities.organizationId, ctx),
          eq(opportunities.status, 'WON'),
          isNull(opportunities.archivedAt),
          isNull(projects.id),
        ),
      )
      .limit(10),
    // DINERO (owner 2026-09-27: «cuánto debo o me deben»). Pendiente por dirección y moneda: IN = te deben,
    // OUT = debes. Sumar euros con dólares no significa nada, así que se agrupa por moneda y la vista pinta una
    // línea por cada una. Es la misma consulta que ya usa la página de Pagos.
    db
      .select({ direction: payments.direction, currencyCode: payments.currencyCode, total: sum(payments.amount), n: count() })
      .from(payments)
      .where(and(orgEq(payments.organizationId, ctx), isNull(payments.archivedAt), eq(payments.status, 'PENDING')))
      .groupBy(payments.direction, payments.currencyCode),
    // Y lo RETRASADO (pendiente con fecha pasada), que es lo que de verdad hay que mirar hoy. Antes sólo existía
    // como aviso con el número de pagos, sin importe: «2 pagos retrasados» no dice si son 40 € o 4.000 €.
    db
      .select({ direction: payments.direction, currencyCode: payments.currencyCode, total: sum(payments.amount), n: count() })
      .from(payments)
      .where(
        and(
          orgEq(payments.organizationId, ctx),
          isNull(payments.archivedAt),
          eq(payments.status, 'PENDING'),
          isNotNull(payments.dueDate),
          lt(payments.dueDate, today),
        ),
      )
      .groupBy(payments.direction, payments.currencyCode),
    toCount(db.select({ n: count() }).from(integrations).where(orgEq(integrations.organizationId, ctx))),
    toCount(db.select({ n: count() }).from(jobs).where(eq(jobs.status, 'PENDING'))),
    toCount(db.select({ n: count() }).from(outboxEvents).where(eq(outboxEvents.status, 'PENDING'))),
    checkDbHealth(),
    listRecentAudit(db, ctx, 5),
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
  // Referencia a la que apunta una entrada del feed. Para una NOTA, el registro interesante no es la nota (que no
  // tiene ficha) sino **el registro del que habla**, que la auditoría guarda en `metadata.targetType/targetId`.
  const targetOf = (meta: Record<string, unknown>) =>
    typeof meta.targetType === 'string' && typeof meta.targetId === 'string'
      ? { entityType: meta.targetType, entityId: meta.targetId }
      : null;

  const metaOf = (a: (typeof recentAudit)[number]) => (a.metadata ?? {}) as Record<string, unknown>;

  // Un solo `resolveEntityNames` para las entidades del audit Y para los destinos de las notas: sólo resuelve las
  // que son archivables, que son justo las que tienen ficha o panel (las demás no se podrían abrir de todas formas).
  const names = await resolveEntityNames(db, ctx, [
    ...recentAudit.map((a) => ({ entityType: a.entityType, entityId: a.entityId ?? '' })),
    ...recentAudit.flatMap((a) => {
      const t = targetOf(metaOf(a));
      return t ? [t] : [];
    }),
  ]);

  const recentActivity = recentAudit.map((a) => {
    const meta = metaOf(a);
    const detail = [meta.status, meta.stage, meta.visibility]
      .filter((v): v is string => typeof v === 'string')
      .at(0);
    const target = targetOf(meta);
    const entityName = a.entityId ? (names.get(`${a.entityType}:${a.entityId}`) ?? null) : null;
    const targetName = target ? (names.get(`${target.entityType}:${target.entityId}`) ?? null) : null;
    // A DÓNDE lleva la entrada, si a algún sitio. Se decide aquí (con los nombres ya resueltos) y la web lo
    // traduce a ruta; la capa de aplicación no conoce rutas ni el registro del panel.
    //  · Un DELETE no enlaza a nada: el registro ya no existe y el enlace estaría roto por definición.
    //  · Una nota enlaza al registro del que habla, no a la nota.
    const linkTo =
      a.action === 'DELETE'
        ? null
        : target && targetName
          ? { ...target, label: targetName }
          : a.entityId && entityName
            ? { entityType: a.entityType, entityId: a.entityId, label: entityName }
            : null;
    return {
      action: a.action,
      entityType: a.entityType,
      entityName,
      detail: detail ?? null,
      /** Registro al que lleva esta entrada (ya con su nombre), o `null` si no hay nada que abrir. */
      linkTo,
      actorType: a.actorType,
      at: a.createdAt,
    };
  });

  /**
   * «Requiere atención» = **triaje de lo que no aparece en ningún otro bloque de esta página**. Se le quitaron las
   * cuatro alertas que repetían una lista de más abajo (tareas vencidas, tareas de hoy, decisiones en revisión y
   * capturas por procesar) y la de pagos retrasados, que ahora vive en el bloque de dinero **con su importe**.
   */
  const attention: AttentionItem[] = [];
  for (const p of atRisk) {
    attention.push({ kind: 'project_at_risk', label: `Proyecto en riesgo: ${p.name}`, href: `/projects/${p.id}`, severity: 'high' });
  }
  for (const o of wonWithoutProject) {
    attention.push({
      kind: 'opportunity_won_no_project',
      label: `Oportunidad ganada sin proyecto: ${o.name}`,
      href: `/crm/opportunities/${o.id}`,
      severity: 'medium',
    });
  }
  if (deliverablesReview > 0) {
    attention.push({ kind: 'deliverables_review', label: `${deliverablesReview} entregable(s) en revisión`, href: '/projects', severity: 'medium' });
  }

  // El PROYECTO de cada tarea de Home: sin él, con varios proyectos activos no se sabe de cuál es cada tarea
  // (petición del owner). Se resuelve con `allProjects`, que ya está cargado: ninguna consulta nueva.
  const projectNameById = new Map(allProjects.map((p) => [p.id, p.name]));
  const withProject = <T extends { projectId: string | null }>(rows: T[]) =>
    rows.map((r) => ({
      ...r,
      projectName: r.projectId ? (projectNameById.get(r.projectId) ?? null) : null,
    }));

  /** Totales de dinero ya normalizados (la consulta devuelve `sum` como string). */
  const money = (rows: { direction: string; currencyCode: string; total: string | null; n: number }[]) =>
    rows.map((r) => ({
      direction: r.direction,
      currencyCode: r.currencyCode,
      total: Number(r.total ?? 0),
      count: Number(r.n),
    }));

  return {
    /**
     * Las tres cifras de arriba. Son las únicas que **no** tienen su lista en esta página: la carga de trabajo, el
     * embudo y la bandeja. Se fueron «Clientes» y «Decisiones» (no pedían ninguna acción: para navegar está el menú)
     * y «Proyectos activos», que era el ejemplo del owner — la lista de abajo dice lo mismo y además dice cuáles.
     */
    snapshot: {
      tasksOpen: tasksOpenN,
      opportunitiesOpen: oppsOpenN,
      inboxPending,
    },
    today,
    money: { pending: money(paymentsPending), overdue: money(paymentsOverdue) },
    attention,
    activeProjects,
    todaysWork: withProject(todaysWork),
    upcoming: withProject(upcoming),
    overdue: withProject(overdue),
    tasksNoDue: tasksNoDueN,
    overdueTasks: overdueN,
    todaysEvents,
    decisionsInReview,
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
