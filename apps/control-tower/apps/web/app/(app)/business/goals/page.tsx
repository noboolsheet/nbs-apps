import Link from 'next/link';
import { getDb } from '@ct/db';
import { listGoals, listStrategicAreas } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ListPage } from '@/components/ui/list-page';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

type Goal = Awaited<ReturnType<typeof listGoals>>[number];

export default async function GoalsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, areas] = await Promise.all([listGoals(db, ctx.org), listStrategicAreas(db, ctx.org)]);
  const areaById = new Map(areas.map((a) => [a.id, a.name]));

  const columns: Column<Goal>[] = [
    {
      header: t('entity.goal'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="goal" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    {
      header: t('business.areaLabel'),
      value: (r) => (r.strategicAreaId ? (areaById.get(r.strategicAreaId) ?? null) : null),
      cell: (r) =>
        r.strategicAreaId ? (
          <Link className="underline underline-offset-2 hover:no-underline" href={`/business/strategic-areas/${r.strategicAreaId}`}>
            {areaById.get(r.strategicAreaId) ?? '—'}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    { header: t('field.status'), value: (r) => enumLabel(r.status), cell: (r) => <StatusBadge status={r.status} /> },
    { header: t('field.priority'), value: (r) => enumLabel(r.priority), cell: (r) => enumLabel(r.priority) },
    { header: t('field.targetDateGoal'), value: (r) => r.targetDate, cell: (r) => (r.targetDate ? formatDate(r.targetDate) : '—') },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.business'), href: '/business' }]}
      title={t('business.goalsTitle')}
      count={rows.length}
      action={<NewRecordButton entity="goal" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('business.goalsEmpty'), hint: t('common.createFirstHint') }}
        selectable
        archive={{ entityType: 'goal' }}
      />
    </ListPage>
  );
}
