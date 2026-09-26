import Link from 'next/link';
import { getDb } from '@ct/db';
import { listAllOpportunityTasks , LIST_LIMIT } from '@ct/application';
import { isTaskActive, type TaskStatus } from '@ct/domain';
import { getCurrentContext } from '@/lib/auth-context';
import { ListPage } from '@/components/ui/list-page';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { RecordTable } from '@/components/ui/record-table';
import { type Column } from '@/components/ui/entity-table';
import { RecordLink } from '@/components/ui/record-link';
import { TaskStatusControl } from '@/components/projects/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

type OppTask = Awaited<ReturnType<typeof listAllOpportunityTasks>>[number];

/** Pestañas de la lista, en orden: Por hacer (activas) · Hechas (DONE) · Todas. */
const TABS = [
  { key: 'pendientes', label: t('crm.tabPending'), match: (t: OppTask) => isTaskActive(t.status as TaskStatus) },
  { key: 'hechas', label: t('crm.tabDone'), match: (t: OppTask) => t.status === 'DONE' },
  { key: 'todas', label: t('crm.tabAll'), match: () => true },
] as const;

/**
 * Vista global de las tareas de PREVENTA (tareas con `opportunityId`), con pestañas Por hacer / Hechas / Todas.
 * Espeja la idea de "Todas las tareas" de Proyectos, pero acotada a las oportunidades.
 */
export default async function OpportunityTasksPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listAllOpportunityTasks(getDb(), ctx.org, LIST_LIMIT);
  const ver = (await searchParams).ver;
  const activeTab = TABS.find((t) => t.key === ver) ?? TABS[0];
  const filtered = rows.filter(activeTab.match);
  const fmtDate = (d: string | null | undefined) => (d ? formatDate(d) : '—');

  const cols: Column<OppTask>[] = [
    {
      header: t('entity.task'),
      cell: (t) => (
        <RecordLink entity="task" id={t.id} className="font-medium underline-offset-2 hover:underline">{t.title}</RecordLink>
      ),
    },
    {
      header: t('entity.opportunity'),
      className: 'w-56',
      cell: (t) => (
        <Link className="text-xs underline underline-offset-2" href={`/crm/opportunities/${t.opportunityId}`}>
          {t.opportunityName}
        </Link>
      ),
    },
    { header: t('field.priority'), className: 'w-24', value: (t) => enumLabel(t.priority), cell: (t) => enumLabel(t.priority) },
    {
      header: t('field.status'),
      className: 'w-40',
      // Si la oportunidad está archivada, sus tareas quedan congeladas → badge de solo lectura.
      cell: (t) => (t.opportunityArchivedAt ? <StatusBadge status={t.status} /> : <TaskStatusControl id={t.id} current={t.status} />),
    },
    { header: t('field.dueDate'), className: 'w-32', cell: (t) => <span className="text-xs text-fg-muted">{fmtDate(t.dueDate)}</span> },
  ];

  return (
    <ListPage
      breadcrumb={[
        { label: t('nav.crm'), href: '/crm' },
        { label: t('crm.opportunitiesTitle'), href: '/crm/opportunities' },
      ]}
      title={t('crm.presalesTasksTitle')}
      filters={
        <FilterTabs
          activeKey={activeTab.key}
          // Ojo: la variable del map NO puede llamarse `t` — taparía la función de traducción.
          tabs={TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            href: tab.key === 'pendientes' ? '/crm/opportunities/tasks' : `/crm/opportunities/tasks?ver=${tab.key}`,
            count: rows.filter(tab.match).length,
          }))}
        />
      }
    >
      <RecordTable
        columns={cols}
        rows={filtered}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{
          title:
            activeTab.key === 'pendientes'
              ? t('crm.presalesTasksPendingEmpty')
              : activeTab.key === 'hechas'
                ? t('crm.presalesTasksDoneEmpty')
                : t('crm.presalesTasksEmpty'),
          hint: t('crm.presalesTasksHint'),
        }}
        selectable
        remove={{ entityType: 'task' }}
      />
    </ListPage>
  );
}
