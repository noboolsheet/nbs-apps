import { getDb } from '@ct/db';
import { listServices } from '@ct/application';
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

type Service = Awaited<ReturnType<typeof listServices>>[number];

export default async function ServicesPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listServices(getDb(), ctx.org);

  const columns: Column<Service>[] = [
    {
      header: t('field.name'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="service" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.status'), value: (r) => enumLabel(r.status), cell: (r) => <StatusBadge status={r.status} /> },
    { header: t('field.kind'), cell: (r) => r.serviceType ?? '—' },
    { header: t('business.slug'), cell: (r) => <code className="text-xs text-fg-muted">{r.slug}</code> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.business'), href: '/business' }]}
      title={t('business.servicios')}
      count={rows.length}
      action={<NewRecordButton entity="service" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('business.aunNoHayServicios'), hint: t('crm.creaElPrimeroConElBotonNuevo') }}
        selectable
        archive={{ entityType: 'service' }}
      />
    </ListPage>
  );
}
