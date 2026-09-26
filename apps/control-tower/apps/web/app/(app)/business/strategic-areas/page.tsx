import { getDb } from '@ct/db';
import { listStrategicAreas } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ListPage } from '@/components/ui/list-page';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';
import { enumLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

type Area = Awaited<ReturnType<typeof listStrategicAreas>>[number];

export default async function StrategicAreasPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listStrategicAreas(getDb(), ctx.org);

  const columns: Column<Area>[] = [
    {
      header: t('business.areaLabel'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="strategic_area" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.status'), value: (r) => enumLabel(r.status), cell: (r) => <StatusBadge status={r.status} /> },
    { header: t('field.sortOrder'), cell: (r) => r.sortOrder },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.business'), href: '/business' }]}
      title={t('business.areasTitle')}
      count={rows.length}
      action={<NewRecordButton entity="strategic_area" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('business.areasEmpty'), hint: t('common.createFirstHintFem') }}
        selectable
        archive={{ entityType: 'strategic_area' }}
      />
    </ListPage>
  );
}
