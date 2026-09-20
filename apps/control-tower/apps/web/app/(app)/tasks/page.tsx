import type { ReactNode } from 'react';
import Link from 'next/link';
import { getDb } from '@ct/db';
import { listActiveTasks, listOverdueTasks, listCompletedTasks, getOrganization, listIdentitiesByInternalType } from '@ct/application';
import { taskBoardBucket, priorityRank, type TaskBoardBucket, type TaskStatus } from '@ct/domain';
import { getCurrentContext } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';
import { SourceBadge } from '@/components/ui/source-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { TaskStatusControl, TaskDueDateControl } from '@/components/projects/forms';
import { RecordLink } from '@/components/ui/record-link';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ListPage } from '@/components/ui/list-page';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { enumLabel } from '@/lib/labels';
import { t, tPlural } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

/** Hoy en la zona horaria de la organización (o UTC). Devuelve 'YYYY-MM-DD'. */
function todayInTz(tz?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// OVERDUE se renderiza en su propia sección (desde `listOverdueTasks`, que incluye subtareas y oportunidad).
const BUCKETS: { key: TaskBoardBucket; label: string; hint?: string; tone: string }[] = [
  { key: 'TODAY', label: t('common.today'), tone: 'text-fg' },
  { key: 'THIS_WEEK', label: t('common.thisWeek'), tone: 'text-fg' },
  { key: 'UPCOMING', label: t('common.upcoming'), tone: 'text-fg-muted' },
  { key: 'BLOCKED', label: t('common.blocked'), tone: 'text-warning' },
  { key: 'NO_DATE', label: t('common.noDate'), tone: 'text-fg-muted' },
];

type Task = Awaited<ReturnType<typeof listActiveTasks>>[number];
type OverdueTask = Awaited<ReturnType<typeof listOverdueTasks>>[number];
type DoneTask = Awaited<ReturnType<typeof listCompletedTasks>>[number];

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return formatDate(d);
}

/**
 * Celda de asociación: Proyecto (link) · Oportunidad (link) · Personal · Sin proyecto, con sufijo «· subtarea»
 * cuando la tarea es hija de otra. Acepta también las tareas de la sección Vencidas (subtareas/oportunidad).
 */
function assocCell(task: {
  projectId: string | null;
  projectName?: string | null;
  personal?: boolean;
  opportunityId?: string | null;
  opportunityName?: string | null;
  parentTaskId?: string | null;
}) {
  const sub = task.parentTaskId ? <span className="text-xs text-fg-subtle">{t('tasks.subtarea')}</span> : null;
  if (task.projectId) {
    return <span className="text-xs"><Link className="underline underline-offset-2" href={`/projects/${task.projectId}`}>{task.projectName ?? t('entity.project')}</Link>{sub}</span>;
  }
  if (task.opportunityId) {
    return <span className="text-xs"><Link className="underline underline-offset-2" href={`/crm/opportunities/${task.opportunityId}`}>{task.opportunityName ?? t('entity.opportunity')}</Link>{sub}</span>;
  }
  if (task.personal) return <span className="text-xs text-fg-muted">{t('projects.personal')}{sub}</span>;
  return <span className="text-xs text-fg-subtle">{t('tasks.noProject')}{sub}</span>;
}

/**
 * Cáscara de la vista de Tareas: el `ListPage` común con las dos pestañas (Activas/Completadas) y, en el
 * hueco de la derecha, el contador y la zona horaria — dato que importa aquí porque «hoy» y «vencida» se
 * calculan en la zona de la organización, no en la del navegador.
 *
 * Las dos vistas (buckets por fecha y lista de completadas) comparten esta cáscara y sólo cambian `children`.
 */
function TasksLayout({
  view,
  count,
  timezone,
  children,
}: {
  view: 'active' | 'completed';
  count: number;
  timezone?: string | null;
  children: ReactNode;
}) {
  return (
    <ListPage
      breadcrumb={[{ label: t('nav.projects'), href: '/projects' }]}
      title={t('tasks.todasLasTareas')}
      subtitle={
        <span className="text-sm text-fg-muted">
          {tPlural(view === 'active' ? 'tasks.countActive' : 'tasks.countCompleted', count)} ·{' '}
          {t('tasks.timezoneLabel')} {timezone ?? 'UTC'}
        </span>
      }
      action={<NewRecordButton entity="task" />}
      filters={
        <FilterTabs
          activeKey={view}
          tabs={[
            { key: 'active', label: t('tasks.tabActive'), href: '/tasks' },
            { key: 'completed', label: t('tasks.tabCompleted'), href: '/tasks?view=completed' },
          ]}
        />
      }
    >
      {children}
    </ListPage>
  );
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const view = (await searchParams).view === 'completed' ? 'completed' : 'active';
  const [org, identities] = await Promise.all([
    getOrganization(db, ctx.org),
    listIdentitiesByInternalType(db, ctx.org, 'task'),
  ]);
  const providerByTask = new Map(identities.map((i) => [i.internalId, i.provider]));

  // --- Vista Completadas (hechas + canceladas), lista única ordenada por recencia de cierre ---
  if (view === 'completed') {
    const done = await listCompletedTasks(db, ctx.org);
    const cols: Column<DoneTask>[] = [
      { header: t('entity.task'), cell: (task) => <RecordLink entity="task" id={task.id} className="font-medium underline-offset-2 hover:underline">{task.title}</RecordLink> },
      {
        header: t('entity.project'),
        className: 'w-44',
        cell: (task) => assocCell(task),
      },
      { header: t('field.priority'), className: 'w-24', value: (task) => enumLabel(task.priority), cell: (task) => <span className="text-xs text-fg-muted">{enumLabel(task.priority)}</span> },
      { header: t('field.sourceType'), className: 'w-28 whitespace-nowrap', value: (task) => providerByTask.get(task.id) ?? 'NATIVE', cell: (task) => <SourceBadge source={providerByTask.get(task.id) ?? 'NATIVE'} /> },
      { header: t('field.status'), className: 'w-36 whitespace-nowrap', value: (task) => enumLabel(task.status), cell: (task) => <StatusBadge status={task.status} /> },
      { header: t('common.completed'), className: 'w-32', value: (task) => task.completedAt, cell: (task) => <span className="text-xs text-fg-muted">{fmtDate(task.completedAt)}</span> },
    ];
    return (
      <TasksLayout view="completed" count={done.length} timezone={org.settings.timezone}>
        <RecordTable
          columns={cols}
          rows={done}
          getKey={(task) => task.id}
          empty={{
            title: t('tasks.aunNoHayTareasCompletadas'),
            hint: t('tasks.lasTareasHechasOCanceladasApareceranAqui'),
          }}
          selectable
          remove={{ entityType: 'task' }}
          fixedLayout
        />
        {done.length > 0 && (
          <p className="text-xs text-fg-subtle">
            {t('tasks.retentionNoticeBefore')}{' '}
            <Link className="underline" href="/settings">
              {t('nav.settings')}
            </Link>
            {t('tasks.retentionNoticeAfter')}
          </p>
        )}
      </TasksLayout>
    );
  }

  // --- Vista Activas (buckets por fecha) ---
  const today = todayInTz(org.settings.timezone);
  const weekEnd = addDays(today, 7);
  // Board = tareas de nivel superior (proyecto/personales). Vencidas = TODAS las vencidas, incluidas subtareas
  // y tareas de oportunidad (igual que Home), porque hay que reprogramarlas exista donde exista.
  const [rows, overdue] = await Promise.all([
    listActiveTasks(db, ctx.org),
    listOverdueTasks(db, ctx.org, today),
  ]);
  overdue.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));

  const grouped = new Map<TaskBoardBucket, Task[]>();
  for (const t of rows) {
    const bucket = taskBoardBucket(t.status as TaskStatus, t.dueDate, today, weekEnd);
    // Las vencidas se pintan en su propia sección (desde `overdue`); aquí evitamos duplicar las de nivel superior.
    if (bucket === 'OVERDUE') continue;
    const arr = grouped.get(bucket) ?? [];
    arr.push(t);
    grouped.set(bucket, arr);
  }
  // Orden dentro de cada bucket: prioridad desc, luego fecha asc.
  for (const arr of grouped.values()) {
    arr.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  }

  // Columnas compartidas por todos los buckets. Con `fixedLayout` + anchos fijos, TODAS las tablas apiladas
  // (Vencidas/Hoy/Esta semana/…) usan exactamente las mismas anchuras → columnas alineadas entre secciones.
  const columns: Column<Task>[] = [
    {
      header: t('entity.task'),
      cell: (task) => (
        <RecordLink entity="task" id={task.id} className="font-medium underline-offset-2 hover:underline">{task.title}</RecordLink>
      ),
    },
    {
      header: t('entity.project'),
      className: 'w-44',
      value: (task) => task.projectName ?? (task.personal ? t('projects.personal') : null),
      cell: (task) => assocCell(task),
    },
    { header: t('field.priority'), className: 'w-24', value: (task) => enumLabel(task.priority), cell: (task) => <span className="text-xs text-fg-muted">{enumLabel(task.priority)}</span> },
    { header: t('field.sourceType'), className: 'w-28 whitespace-nowrap', value: (task) => providerByTask.get(task.id) ?? 'NATIVE', cell: (task) => <SourceBadge source={providerByTask.get(task.id) ?? 'NATIVE'} /> },
    { header: t('field.status'), className: 'w-40 whitespace-nowrap', value: (task) => enumLabel(task.status), cell: (task) => <TaskStatusControl id={task.id} current={task.status} /> },
    { header: t('field.dueDate'), className: 'w-40', value: (task) => task.dueDate, cell: (task) => <TaskDueDateControl id={task.id} current={task.dueDate} /> },
  ];

  // Columnas de la sección "Vencidas": mismos anchos que `columns` (alineación con `fixedLayout`), pero sobre
  // `OverdueTask` (incluye subtareas y tareas de oportunidad, que `assocCell` etiqueta con su origen).
  const overdueColumns: Column<OverdueTask>[] = [
    {
      header: t('entity.task'),
      cell: (task) => (
        <RecordLink entity="task" id={task.id} className="font-medium underline-offset-2 hover:underline">{task.title}</RecordLink>
      ),
    },
    { header: t('entity.project'), className: 'w-44', value: (task) => task.projectName ?? task.opportunityName ?? null, cell: (task) => assocCell(task) },
    { header: t('field.priority'), className: 'w-24', value: (task) => enumLabel(task.priority), cell: (task) => <span className="text-xs text-fg-muted">{enumLabel(task.priority)}</span> },
    { header: t('field.sourceType'), className: 'w-28 whitespace-nowrap', value: (task) => providerByTask.get(task.id) ?? 'NATIVE', cell: (task) => <SourceBadge source={providerByTask.get(task.id) ?? 'NATIVE'} /> },
    { header: t('field.status'), className: 'w-40 whitespace-nowrap', value: (task) => enumLabel(task.status), cell: (task) => <TaskStatusControl id={task.id} current={task.status} /> },
    { header: t('field.dueDate'), className: 'w-40', value: (task) => task.dueDate, cell: (task) => <TaskDueDateControl id={task.id} current={task.dueDate} /> },
  ];

  return (
    <TasksLayout view="active" count={rows.length} timezone={org.settings.timezone}>
      {rows.length === 0 && overdue.length === 0 ? (
        <EmptyState title={t('tasks.noHayTareasActivas')} hint={t('tasks.creaUnaDentroDeUnProyectoOUnaOportunidad')} />
      ) : (
        <>
          {/* Vencidas: TODAS las activas con fecha pasada (incl. subtareas y tareas de oportunidad), arriba del todo. */}
          {overdue.length > 0 && (
            <section className="flex flex-col gap-2 rounded-lg border border-danger-border bg-danger-soft p-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-danger">{t('common.overdue')}</h2>
                <span className="text-xs font-normal text-fg-subtle">({overdue.length})</span>
                <span className="text-xs text-fg-subtle">{t('tasks.reprogramaSuFechaParaReactivarlas')}</span>
              </div>
              <RecordTable
                columns={overdueColumns}
                rows={overdue}
                getKey={(task) => task.id}
                selectable
                remove={{ entityType: 'task' }}
                fixedLayout
              />
            </section>
          )}
          {BUCKETS.map(({ key, label, hint, tone }) => {
            const items = grouped.get(key) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={key} className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-sm font-semibold uppercase tracking-wide ${tone}`}>{label}</h2>
                  <span className="text-xs font-normal text-fg-subtle">({items.length})</span>
                  {hint && <span className="text-xs text-fg-subtle">· {hint}</span>}
                </div>
                <RecordTable
                  columns={columns}
                  rows={items}
                  getKey={(task) => task.id}
                  selectable
                  remove={{ entityType: 'task' }}
                  fixedLayout
                />
              </section>
            );
          })}
        </>
      )}
    </TasksLayout>
  );
}
