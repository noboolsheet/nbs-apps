import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getTask, listProjects, listSubtasks, resolveOrgTodayRange, getIdentityForInternal, getOpportunityFreeze, getOpportunity } from '@ct/application';
import { PRIORITY, ownedFields, PROVIDER_LABEL } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskStatusControl, TaskDueDateControl, TaskDueTodayButton } from '@/components/projects/forms';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let task: Awaited<ReturnType<typeof getTask>>;
  try {
    task = await getTask(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const [projects, subtasks, dayRange, identity] = await Promise.all([
    listProjects(getDb(), ctx.org),
    listSubtasks(getDb(), ctx.org, id),
    resolveOrgTodayRange(getDb(), ctx.org),
    getIdentityForInternal(getDb(), ctx.org, 'task', id),
  ]);
  const today = dayRange.today;
  const owned = new Set(ownedFields('task', identity?.provider));
  const ownedHint = identity
    ? t('panel.ownedByProvider', { provider: PROVIDER_LABEL[identity.provider] ?? identity.provider })
    : undefined;
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  // Tarea congelada (solo lectura) si su proyecto está CERRADO o su oportunidad está ARCHIVADA o CERRADA.
  const oppFreeze = task.opportunityId ? await getOpportunityFreeze(getDb(), ctx.org, task.opportunityId) : null;
  // Oportunidad a la que pertenece (tarea de preventa): se muestra como contexto de solo lectura.
  const opportunity = task.opportunityId ? await getOpportunity(getDb(), ctx.org, task.opportunityId).catch(() => null) : null;
  const frozen = project?.status === 'CLOSED' || !!oppFreeze?.archived || !!oppFreeze?.closed;
  const frozenHint = oppFreeze?.archived
    ? t('tasks.readOnlyOpportunityArchived')
    : oppFreeze?.closed
      ? t('tasks.readOnlyOpportunityClosed')
      : t('tasks.readOnlyProjectClosed');
  const subtasksDone = subtasks.filter((st) => st.status === 'DONE').length;
  const fmtDate = (d: string | null | undefined) => (d ? formatDate(d) : '—');
  const subtaskColumns: Column<(typeof subtasks)[number]>[] = [
    {
      header: t('tasks.subtask'),
      cell: (st) => (
        <RecordLink entity="task" id={st.id} className="underline-offset-2 hover:underline">{st.title}</RecordLink>
      ),
    },
    { header: t('field.priority'), className: 'w-24', cell: (st) => <span className="text-xs text-fg-muted">{enumLabel(st.priority)}</span> },
    { header: t('field.status'), className: 'w-40', cell: (st) => (frozen ? <StatusBadge status={st.status} /> : <TaskStatusControl id={st.id} current={st.status} />) },
    { header: t('tasks.reschedule'), className: 'w-40', cell: (st) => (frozen ? <span className="text-xs text-fg-muted">{fmtDate(st.dueDate)}</span> : <TaskDueDateControl id={st.id} current={st.dueDate} />) },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/projects">{t('nav.projects')}</Link> /{' '}
        {project ? (
          <>
            <Link className="hover:underline" href={`/projects/${project.id}`}>{project.name}</Link> /{' '}
          </>
        ) : null}
        {task.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <StatusBadge status={task.status} />
      </div>

      <InlineEditSection
        title={t('entity.task')}
        endpoint={`/api/v1/tasks/${task.id}`}
        fields={[
          { name: 'title', label: t('field.title'), type: 'text', value: task.title, readOnly: frozen || owned.has('title'), readOnlyHint: frozen ? frozenHint : ownedHint },
          { name: 'description', label: t('field.description'), type: 'textarea', value: task.description, readOnly: frozen, readOnlyHint: frozenHint },
          { name: 'priority', label: t('field.priority'), type: 'select', options: PRIORITY, value: task.priority, readOnly: frozen, readOnlyHint: frozenHint },
          {
            name: 'dueDate',
            label: t('deliverables.dueDateLabel'),
            type: 'date',
            value: task.dueDate,
            display: task.dueDate ? formatDate(task.dueDate) : null,
            readOnly: frozen,
            readOnlyHint: frozenHint,
          },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('field.status')}:</span>
          {frozen ? <StatusBadge status={task.status} /> : <TaskStatusControl id={task.id} current={task.status} />}
        </div>
        {frozen ? (
          <p className="text-xs text-fg-subtle">{frozenHint} Para modificarla, crea un proyecto nuevo.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-fg-muted">{t('tasks.reschedule')}:</span>
            <TaskDueDateControl id={task.id} current={task.dueDate} />
            <TaskDueTodayButton id={task.id} today={today} />
          </div>
        )}
        <DescriptionList
          items={[
            {
              label: t('entity.project'),
              value: project ? (
                <Link className="underline underline-offset-2" href={`/projects/${project.id}`}>{project.name}</Link>
              ) : null,
            },
            ...(opportunity
              ? [{
                  label: t('entity.opportunity'),
                  value: (
                    <Link className="underline underline-offset-2" href={`/crm/opportunities/${opportunity.id}`}>{opportunity.name}</Link>
                  ),
                }]
              : []),
            { label: t('common.completed'), value: task.completedAt ? formatDateTime(task.completedAt) : null },
            { label: t('meta.sourceOfTruth'), value: t('tasks.nativeSource') },
            { label: t('meta.createdAtFem'), value: formatDateTime(task.createdAt) },
          ]}
        />
      </section>

      {/* Subtareas: pasos internos de esta tarea (100% Control Tower, no van a Twenty). */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
          Subtareas {subtasks.length > 0 && <span className="text-fg-subtle">({subtasksDone}/{subtasks.length})</span>}
        </h2>
        {!frozen && (
          <div className="flex justify-end">
            <ContextNewButton entity="task" ctxKey="task" parentId={task.id} label={t('tasks.newSubtask')} />
          </div>
        )}
        {subtasks.length === 0 ? (
          <EmptyState title={t('tasks.subtasksEmpty')} hint={t('tasks.subtasksEmptyHint')} />
        ) : (
          <RecordTable
            columns={subtaskColumns}
            rows={subtasks}
            getKey={(st) => st.id}
            selectable
            remove={{ entityType: 'task' }}
          />
        )}
      </section>
    </div>
  );
}
