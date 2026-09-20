import { getDb } from '@ct/db';
import { listClients, listIdentitiesByInternalType , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { SourceBadge } from '@/components/ui/source-badge';
import { ListPage } from '@/components/ui/list-page';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ClientStatusControl } from '@/components/crm/forms';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Client = Awaited<ReturnType<typeof listClients>>[number];

// Filtros de la lista (estado sólo de CT). Active primero y por defecto (son los que interesan).
const FILTERS = [
  { key: 'ACTIVE', label: t('filter.active'), status: 'ACTIVE' },
  { key: 'INACTIVE', label: t('crm.inactivos'), status: 'INACTIVE' },
  { key: 'all', label: t('projects.tabAll'), status: undefined },
] as const;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const raw = (await searchParams).status;
  const active = FILTERS.find((f) => f.key === raw) ?? FILTERS[0]; // sin/desconocido → Active
  const [allClients, identities] = await Promise.all([
    listClients(db, ctx.org, undefined, LIST_LIMIT),
    listIdentitiesByInternalType(db, ctx.org, 'client'),
  ]);
  // Filtramos en JS por el estado del filtro activo (ACTIVE/INACTIVE; 'all' = todos).
  const rows = active.status ? allClients.filter((c) => c.status === active.status) : allClients;
  // Un cliente es nativo salvo que exista una identidad externa (p. ej. sincronizado desde Twenty).
  const providerByClient = new Map(identities.map((i) => [i.internalId, i.provider]));

  const columns: Column<Client>[] = [
    {
      header: t('entity.client'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="client" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.status'), cell: (r) => <ClientStatusControl id={r.id} current={r.status} /> },
    { header: t('field.industry'), cell: (r) => r.industry ?? '—' },
    { header: t('field.sourceType'), cell: (r) => <SourceBadge source={providerByClient.get(r.id) ?? 'NATIVE'} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.crm'), href: '/crm' }]}
      title={t('home.metricClients')}
      action={<NewRecordButton entity="client" />}
      filters={
        <FilterTabs
          activeKey={active.key}
          tabs={FILTERS.map((f) => ({
            key: f.key,
            label: f.label,
            href: `/crm/clients?status=${f.key}`,
            count: f.status ? allClients.filter((c) => c.status === f.status).length : allClients.length,
          }))}
        />
      }
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{
          title: t('crm.sinClientesEnEstaVista'),
          hint: active.key === 'ACTIVE' ? t('crm.creaUnoConElFormularioDeArriba') : undefined,
        }}
        selectable
        archive={{ entityType: 'client' }}
      />
    </ListPage>
  );
}
