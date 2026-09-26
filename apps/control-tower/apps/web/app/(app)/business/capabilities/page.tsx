import { getDb } from '@ct/db';
import { listCapabilities } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ListPage } from '@/components/ui/list-page';
import { StatusControl } from '@/components/business/forms';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Capability = Awaited<ReturnType<typeof listCapabilities>>[number];

export default async function CapabilitiesPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listCapabilities(getDb(), ctx.org);

  const columns: Column<Capability>[] = [
    {
      header: t('entity.capability'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="capability" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.maturity'), cell: (r) => <StatusBadge status={r.maturity} /> },
    { header: t('field.status'), cell: (r) => <StatusControl kind="capabilities" id={r.id} current={r.status} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.business'), href: '/business' }]}
      title={t('business.capabilitiesTitle')}
      count={rows.length}
      action={<NewRecordButton entity="capability" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('business.capabilitiesEmpty'), hint: t('common.createFirstHintFem') }}
        selectable
        archive={{ entityType: 'capability' }}
      />
    </ListPage>
  );
}
