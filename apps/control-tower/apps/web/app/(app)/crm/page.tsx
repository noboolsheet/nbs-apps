import Link from 'next/link';
import { getDb } from '@ct/db';
import { listClients, listContacts, listOpportunities } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function CrmOverviewPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [clients, contacts, opportunities] = await Promise.all([
    listClients(db, ctx.org),
    listContacts(db, ctx.org),
    listOpportunities(db, ctx.org),
  ]);
  const open = opportunities.filter((o) => o.status === 'OPEN').length;

  const cards = [
    { label: t('home.metricClients'), href: '/crm/clients', value: clients.length },
    { label: t('crm.contactos'), href: '/crm/contacts', value: contacts.length },
    { label: t('crm.oportunidadesAbiertas'), href: '/crm/opportunities', value: open },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg border border-line p-4 hover:bg-surface-muted/40"
          >
            <div className="text-2xl font-semibold">{c.value}</div>
            <div className="text-sm text-fg-muted">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
