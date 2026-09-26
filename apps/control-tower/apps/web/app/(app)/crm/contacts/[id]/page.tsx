import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getContact, listClients, getIdentityForInternal } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let contact: Awaited<ReturnType<typeof getContact>>;
  try {
    contact = await getContact(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const [clients, identity] = await Promise.all([
    listClients(getDb(), ctx.org),
    getIdentityForInternal(getDb(), ctx.org, 'contact', id),
  ]);
  const clientName = contact.clientId ? clients.find((c) => c.id === contact.clientId)?.name : null;
  const crmUrl = (identity?.metadata as { url?: string } | null)?.url ?? null;
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '(sin nombre)';

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/crm">CRM</Link> /{' '}
        <Link className="hover:underline" href="/crm/contacts">{t('crm.contactsTitle')}</Link> / {fullName}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
        <StatusBadge status={contact.status} />
        <SourceBadge source={identity?.provider ?? 'NATIVE'} url={crmUrl} linkLabel={t('crm.openInCrm')} />
      </div>

      <InlineEditSection
        title={t('crm.contactData')}
        endpoint={`/api/v1/contacts/${contact.id}`}
        fields={[
          { name: 'firstName', label: t('field.name'), type: 'text', value: contact.firstName },
          { name: 'lastName', label: t('field.lastName'), type: 'text', value: contact.lastName },
          { name: 'email', label: t('field.email'), type: 'text', value: contact.email },
          { name: 'phone', label: t('field.phone'), type: 'text', value: contact.phone },
          { name: 'jobTitle', label: t('field.jobTitle'), type: 'text', value: contact.jobTitle },
          {
            name: 'clientId',
            label: t('entity.client'),
            type: 'select',
            options: clients.map((c) => ({ value: c.id, label: c.name })),
            value: contact.clientId,
            display: clientName ?? null,
          },
          { name: 'notes', label: t('field.notes'), type: 'textarea', value: contact.notes },
        ]}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('field.context')}</h2>
        <DescriptionList
          items={[
            {
              label: t('crm.viewClient'),
              value: contact.clientId ? (
                <Link className="underline underline-offset-2" href={`/crm/clients/${contact.clientId}`}>
                  {clientName ?? contact.clientId.slice(0, 8) + '…'}
                </Link>
              ) : null,
            },
            { label: t('meta.sourceOfTruth'), value: <SourceBadge source={identity?.provider ?? 'NATIVE'} url={crmUrl} linkLabel={t('crm.openInCrm')} /> },
            { label: t('meta.createdAt'), value: formatDateTime(contact.createdAt) },
            { label: t('meta.updatedAt'), value: formatDateTime(contact.updatedAt) },
          ]}
        />
      </section>
    </div>
  );
}
