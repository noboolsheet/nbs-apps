import { getDb } from '@ct/db';
import { listContacts, listClients, listIdentitiesByInternalType , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { SourceBadge } from '@/components/ui/source-badge';
import { ListPage } from '@/components/ui/list-page';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Contact = Awaited<ReturnType<typeof listContacts>>[number];

export default async function ContactsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, clients, identities] = await Promise.all([
    listContacts(db, ctx.org, LIST_LIMIT),
    listClients(db, ctx.org),
    listIdentitiesByInternalType(db, ctx.org, 'contact'),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c.name]));
  const providerByContact = new Map(identities.map((i) => [i.internalId, i.provider]));

  const columns: Column<Contact>[] = [
    {
      header: t('field.name'),
      value: (r) => [r.firstName, r.lastName].filter(Boolean).join(' '),
      cell: (r) => (
        <RecordLink entity="contact" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {[r.firstName, r.lastName].filter(Boolean).join(' ') || t('common.unnamed')}
        </RecordLink>
      ),
    },
    { header: t('entity.client'), value: (r) => (r.clientId ? (clientById.get(r.clientId) ?? null) : null), facet: true, cell: (r) => (r.clientId ? (clientById.get(r.clientId) ?? '—') : '—') },
    { header: t('field.email'), value: (r) => r.email, cell: (r) => r.email ?? '—' },
    { header: t('field.phone'), value: (r) => r.phone, cell: (r) => r.phone ?? '—' },
    { header: t('field.sourceType'), value: (r) => providerByContact.get(r.id) ?? 'NATIVE', facet: true, cell: (r) => <SourceBadge source={providerByContact.get(r.id) ?? 'NATIVE'} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.crm'), href: '/crm' }]}
      title={t('crm.contactsTitle')}
      count={rows.length}
      // Sin botón de «Nuevo»: los contactos nacen en Twenty (ADR-009). Un contacto creado aquí no existiría en
      // el CRM, que es su dueño.
    >
      {/* Sin «Archivar»: igual que los clientes, los contactos son de Twenty (ADR-009/ADR-010). */}
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{ title: t('crm.contactsEmpty'), hint: t('common.createFirstHint') }}
      />
    </ListPage>
  );
}
