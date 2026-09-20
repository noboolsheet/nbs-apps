import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import {
  getProjectDetail,
  listDocuments,
  listDecisions,
  listResourcesByProject,
  listProjectAssets,
  listAssets,
} from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { HealthBadge } from '@/components/ui/health-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { DescriptionList } from '@/components/ui/description-list';
import { ResourceList } from '@/components/resources/resource-list';
import { ProjectAssets } from '@/components/projects/project-assets';
import {
  ProjectStatusControl,
  TaskStatusControl,
  DeliverableStatusControl,
  PhaseActions,
} from '@/components/projects/forms';
import { DecisionStatusControl, CreateDocumentForm } from '@/components/knowledge/forms';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { SourceBadge } from '@/components/ui/source-badge';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let detail: Awaited<ReturnType<typeof getProjectDetail>>;
  try {
    detail = await getProjectDetail(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const { project, phases, tasks, deliverables } = detail;
  const currentPhase = phases.find((p) => p.id === project.currentPhaseId);
  const db = getDb();
  const [documents, decisions, projectResources, linkedAssets, assetCatalog] = await Promise.all([
    listDocuments(db, ctx.org, { projectId: project.id }),
    listDecisions(db, ctx.org, { projectId: project.id }),
    listResourcesByProject(db, ctx.org, project.id),
    listProjectAssets(db, ctx.org, project.id), // A-3 (ADR-007): reutilizables enlazados
    listAssets(db, ctx.org), // catálogo de la org, para el selector de enlace
  ]);
  // Proyecto cerrado = congelado: estado no editable, y sus tareas de solo lectura (estado + fecha).
  const closed = project.status === 'CLOSED';
  const fmtDate = (d: string | null | undefined) => (d ? formatDate(d) : '—');

  const taskCols: Column<(typeof tasks)[number]>[] = [
    {
      header: t('entity.task'),
      cell: (task) => (
        <RecordLink entity="task" id={task.id} className="font-medium underline-offset-2 hover:underline">{task.title}</RecordLink>
      ),
    },
    { header: t('field.priority'), className: 'w-24', value: (task) => enumLabel(task.priority), cell: (task) => enumLabel(task.priority) },
    {
      header: t('field.status'),
      className: 'w-40',
      cell: (task) => (closed ? <StatusBadge status={task.status} /> : <TaskStatusControl id={task.id} current={task.status} />),
    },
    { header: t('field.dueDate'), className: 'w-32', cell: (task) => <span className="text-xs text-fg-muted">{fmtDate(task.dueDate)}</span> },
  ];
  const delivCols: Column<(typeof deliverables)[number]>[] = [
    {
      header: t('entity.deliverable'),
      cell: (d) => (
        <RecordLink entity="deliverable" id={d.id} className="font-medium underline-offset-2 hover:underline">{d.name}</RecordLink>
      ),
    },
    { header: t('field.status'), cell: (d) => <DeliverableStatusControl id={d.id} current={d.status} /> },
  ];
  const phaseCols: Column<(typeof phases)[number]>[] = [
    {
      header: t('entity.project_phase'),
      value: (ph) => ph.name,
      cell: (ph) => (
        <RecordLink
          entity="project_phase"
          id={ph.id}
          className={`underline-offset-2 hover:underline ${ph.id === project.currentPhaseId ? 'font-semibold' : ''}`}
        >
          {ph.name}
        </RecordLink>
      ),
    },
    { header: t('field.status'), className: 'w-36', cell: (ph) => <StatusBadge status={ph.status} /> },
    {
      header: t('projects.phaseCurrent'),
      className: 'w-56',
      cell: (ph) => (
        <PhaseActions projectId={project.id} phaseId={ph.id} isCurrent={ph.id === project.currentPhaseId} frozen={closed} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/projects">{t('nav.projects')}</Link> / {project.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <StatusBadge status={project.status} />
        <HealthBadge health={project.health} />
        <ProgressBar value={project.progress} />
      </div>

      <Tabs
        tabs={[
          {
            label: t('common.summary'),
            // Un dato por línea (`DescriptionList`): antes iban encadenados con «·» y salían líneas larguísimas.
            content: (
              <DescriptionList
                items={[
                  {
                    label: t('field.status'),
                    value: closed ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <StatusBadge status={project.status} />
                        <span className="text-xs text-fg-subtle">{t('projects.closedNotice')}</span>
                      </span>
                    ) : (
                      <ProjectStatusControl id={project.id} current={project.status} />
                    ),
                  },
                  { label: t('field.kind'), value: enumLabel(project.type) },
                  { label: t('projects.colRelated'), value: project.clientName ?? project.contactName ?? null },
                  { label: t('projects.currentPhase'), value: currentPhase?.name ?? null },
                  { label: t('projects.phases'), value: String(phases.length) },
                  { label: t('projects.tasks'), value: `${project.taskDone}/${project.taskTotal}` },
                  { label: t('projects.targetDate'), value: formatDate(project.targetDate) },
                  { label: t('field.description'), value: project.description },
                ]}
              />
            ),
          },
          {
            label: `${t('projects.phases')} (${phases.length})`,
            content: (
              <div className="flex flex-col gap-3">
                {!closed && (
                  <div className="flex justify-end">
                    <ContextNewButton entity="project_phase" ctxKey="project" parentId={project.id} label={t('projects.newPhase')} />
                  </div>
                )}
                {phases.length === 0 ? (
                  <EmptyState title={t('projects.phasesEmpty')} hint={t('projects.phasesEmptyHint')} />
                ) : (
                  <RecordTable
                    columns={phaseCols}
                    rows={phases}
                    getKey={(ph) => ph.id}
                  />
                )}
              </div>
            ),
          },
          {
            label: `${t('projects.tasks')} (${tasks.length})`,
            content: (
              <div className="flex flex-col gap-3">
                {!closed && (
                  <div className="flex justify-end">
                    <ContextNewButton entity="task" ctxKey="project" parentId={project.id} label={t('projects.newTask')} />
                  </div>
                )}
                {tasks.length === 0 ? (
                  <EmptyState title={t('projects.tasksEmpty')} hint={t('projects.tasksEmptyHint')} />
                ) : (
                  <RecordTable
                    columns={taskCols}
                    rows={tasks}
                    getKey={(task) => task.id}
                    selectable
                    remove={{ entityType: 'task' }}
                  />
                )}
              </div>
            ),
          },
          {
            label: `${t('projects.deliverables')} (${deliverables.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="deliverable" ctxKey="project" parentId={project.id} label={t('projects.newDeliverable')} />
                </div>
                {deliverables.length === 0 ? (
                  <EmptyState title={t('projects.deliverablesEmpty')} />
                ) : (
                  <RecordTable
                    columns={delivCols}
                    rows={deliverables}
                    getKey={(d) => d.id}
                    selectable
                    archive={{ entityType: 'deliverable' }}
                  />
                )}
              </div>
            ),
          },
          {
            label: `${t('decisions.title')} (${decisions.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="decision" ctxKey="project" parentId={project.id} label={t('decisions.new')} />
                </div>
                {decisions.length === 0 ? (
                  <EmptyState title={t('decisions.empty')} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {decisions.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm">
                        <RecordLink entity="decision" id={d.id} className="font-medium underline-offset-2 hover:underline">{d.title}</RecordLink>
                        <DecisionStatusControl id={d.id} current={d.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            label: `${t('documents.title')} (${documents.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <CreateDocumentForm projectId={project.id} />
                {documents.length === 0 ? (
                  <EmptyState title={t('documents.empty')} hint={t('documents.emptyHint')} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm">
                        <span>{doc.name}</span>
                        <SourceBadge source={doc.externalProvider} url={doc.externalUrl} linkLabel={t('common.open')} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            label: `${t('resources.title')} (${projectResources.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="resource" ctxKey="project" parentId={project.id} label={t('resources.new')} />
                </div>
                <ResourceList rows={projectResources} />
              </div>
            ),
          },
          {
            // A-3 (ADR-007). Distinto de la pestaña «Activos» (resources = accesos/apps del proyecto):
            // aquí van los activos REUTILIZABLES del catálogo (plantillas, repos, componentes).
            label: `${t('projects.reusables')} (${linkedAssets.length})`,
            content: (
              <div className="flex flex-col gap-3">
                {!closed && (
                  <div className="flex justify-end">
                    <ContextNewButton entity="asset" ctxKey="project" parentId={project.id} label={t('projects.newReusable')} />
                  </div>
                )}
                <ProjectAssets
                  projectId={project.id}
                  linked={linkedAssets}
                  catalog={assetCatalog.map((a) => ({ id: a.id, name: a.name }))}
                  frozen={closed}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
