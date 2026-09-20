import Link from 'next/link';
import { getDb } from '@ct/db';
import { listProjects, type ProjectWithDerived } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { HealthBadge } from '@/components/ui/health-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ListPage } from '@/components/ui/list-page';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ProjectStatusControl } from '@/components/projects/forms';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Las keys de TABS son claves lógicas (filtrado + query `?tab=`); NO se traducen. Sólo se traduce su etiqueta visible.
// Orden: Activos primero (vista por defecto al entrar); "Todos" al final.
const TABS = ['Active', 'At Risk', 'Blocked', 'Completed', 'All'] as const;
const TAB_LABEL: Record<string, string> = {
  All: t('projects.tabAll'),
  Active: t('filter.active'),
  'At Risk': t('health.atRisk'),
  Blocked: t('projects.tabBlocked'),
  Completed: t('projects.tabCompleted'),
};
const COMPLETED = ['DELIVERED', 'CLOSED', 'ARCHIVED'];

function matchesTab(p: ProjectWithDerived, tab: string): boolean {
  switch (tab) {
    case 'Active':
      return p.status === 'ACTIVE';
    case 'At Risk':
      return p.health === 'AT_RISK';
    case 'Blocked':
      return p.status === 'BLOCKED' || p.status === 'WAITING';
    case 'Completed':
      return COMPLETED.includes(p.status);
    default:
      return true;
  }
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const all = await listProjects(getDb(), ctx.org);
  const tab = (await searchParams).tab ?? 'Active'; // sin query → Activos (vista por defecto)
  const rows = all.filter((p) => matchesTab(p, tab));

  const columns: Column<ProjectWithDerived>[] = [
    {
      header: t('entity.project'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="project" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    {
      header: t('projects.colRelated'),
      value: (r) => (r.personal ? t('projects.personal') : (r.clientName ?? r.contactName ?? null)),
      cell: (r) =>
        r.personal ? (
          <span className="inline-flex items-center rounded-full bg-neutral-soft px-2 py-0.5 text-xs font-medium text-neutral-soft-fg">
            {t('projects.personal')}
          </span>
        ) : (
          (r.clientName ?? r.contactName ?? '—')
        ),
    },
    { header: t('field.kind'), className: 'w-28', value: (r) => enumLabel(r.type), cell: (r) => <span className="text-xs text-fg-muted">{enumLabel(r.type)}</span> },
    { header: t('field.status'), value: (r) => enumLabel(r.status), cell: (r) => (r.status === 'CLOSED' ? <StatusBadge status={r.status} /> : <ProjectStatusControl id={r.id} current={r.status} />) },
    { header: t('projects.colHealth'), value: (r) => r.health, cell: (r) => <HealthBadge health={r.health} /> },
    { header: t('projects.colProgress'), value: (r) => r.progress, cell: (r) => <ProgressBar value={r.progress} /> },
  ];

  return (
    <ListPage
      title={t('nav.projects')}
      action={<NewRecordButton entity="project" />}
      filters={
        <FilterTabs
          activeKey={tab}
          tabs={TABS.map((tab_) => ({
            key: tab_,
            label: TAB_LABEL[tab_] ?? tab_,
            href: tab_ === 'Active' ? '/projects' : `/projects?tab=${encodeURIComponent(tab_)}`,
            count: all.filter((p) => matchesTab(p, tab_)).length,
          }))}
          // El enlace a la vista global de tareas va en la fila de los filtros, no pegado al botón de crear.
          trailing={
            <Link className="text-sm text-link underline-offset-2 hover:underline" href="/tasks">
              {t('projects.allTasksLink')}
            </Link>
          }
        />
      }
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('projects.emptyView'), hint: t('common.createWithNewButton') }}
        selectable
        archive={{ entityType: 'project' }}
      />
    </ListPage>
  );
}
