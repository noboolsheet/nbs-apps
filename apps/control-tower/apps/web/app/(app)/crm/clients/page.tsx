import { getDb } from '@ct/db';
import { listClients, listIdentitiesByInternalType , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { ListPage } from '@/components/ui/list-page';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ClientStatusControl } from '@/components/crm/forms';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Client = Awaited<ReturnType<typeof listClients>>[number];

// Filtros de la lista (estado sólo de CT). Active primero y por defecto (son los que interesan).
const FILTERS = [
  { key: 'ACTIVE', label: t('filter.active'), status: 'ACTIVE' },
  { key: 'INACTIVE', label: t('crm.tabInactive'), status: 'INACTIVE' },
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
  // URL del registro en Twenty («Open in CRM», F-1). Sustituye a la columna de procedencia: con todo el CRM
  // viniendo de Twenty, saber que viene de Twenty no informa — poder abrirlo allí, sí.
  const crmUrlByClient = new Map(
    identities.map((i) => [i.internalId, (i.metadata as { url?: string } | null)?.url ?? null]),
  );
  // **Empresa o particular**, DERIVADO de la identidad: un cliente que llega de una `company` de Twenty es una
  // empresa; el que llega de una `person` con el rol `INDIVIDUAL_CLIENT` es un particular (ADR-010). No se guarda en
  // ninguna columna a propósito: sería un tercer valor que podría quedarse viejo respecto a Twenty, que es su dueño.
  const externalTypeByClient = new Map(identities.map((i) => [i.internalId, i.externalType]));
  const clientKind = (id: string) =>
    externalTypeByClient.get(id) === 'person' ? t('crm.kindIndividual') : t('crm.kindCompany');

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
    {
      header: t('field.kind'),
      className: 'w-28',
      value: (r) => clientKind(r.id),
      facet: true,
      cell: (r) => <span className="text-xs text-fg-muted">{clientKind(r.id)}</span>,
    },
    { header: t('field.status'), value: (r) => enumLabel(r.status), facet: true, cell: (r) => <ClientStatusControl id={r.id} current={r.status} /> },
    // `clients.industry` guarda el **Organization Type** de Twenty (Empresa, Centro educativo, Autónomo…), así que
    // la columna se llama por lo que es. `enumLabel` traduce los códigos del contrato y deja pasar una etiqueta propia.
    {
      header: t('field.organizationType'),
      value: (r) => (r.industry ? enumLabel(r.industry) : null),
      facet: true,
      cell: (r) => (r.industry ? enumLabel(r.industry) : '—'),
    },
    {
      header: t('crm.openInCrm'),
      className: 'w-28',
      cell: (r) => {
        const url = crmUrlByClient.get(r.id);
        return url ? <ExternalSourceLink url={url} label={t('crm.openInCrm')} /> : <span className="text-fg-subtle">—</span>;
      },
    },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.crm'), href: '/crm' }]}
      title={t('home.metricClients')}
      // Sin botón de «Nuevo»: los clientes nacen en Twenty (ADR-009/ADR-010) y crear uno aquí sería un registro
      // que no existe en el CRM. El panel tampoco ofrece creación (el registro no tiene `createPath`).
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
      {/* Sin «Archivar»: los clientes los gobierna Twenty y aparecen o desaparecen según lo que exista allí
          (owner 2026-09-27, ADR-009/ADR-010). Lo que el sync archive por haber desaparecido del CRM se ve en
          Ajustes › Archivados, y desde ahí sólo se puede eliminar. */}
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{
          title: t('crm.clientsEmptyView'),
          hint: active.key === 'ACTIVE' ? t('crm.clientsEmptyHint') : undefined,
        }}
      />
    </ListPage>
  );
}
