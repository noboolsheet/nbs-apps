import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getServiceWithCapabilities, listCapabilities } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { RecordLink } from '@/components/ui/record-link';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { StatusControl, LinkCapabilityControl } from '@/components/business/forms';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let detail: Awaited<ReturnType<typeof getServiceWithCapabilities>>;
  try {
    detail = await getServiceWithCapabilities(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const { service, capabilities: linked } = detail;
  const all = await listCapabilities(getDb(), ctx.org);
  const linkedIds = new Set(linked.map((c) => c.id));
  const linkable = all.filter((c) => !linkedIds.has(c.id)).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> /{' '}
        <Link className="hover:underline" href="/business/services">{t('business.servicesTitle')}</Link> / {service.name}
      </nav>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
        <StatusBadge status={service.status} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-fg-muted">{t('field.status')}</h2>
        <StatusControl kind="services" id={service.id} current={service.status} />
      </section>

      {service.description && <p className="text-sm text-fg-muted">{service.description}</p>}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-fg-muted">{t('business.capabilitiesTitle')}</h2>
          <ContextNewButton entity="capability" ctxKey="service" parentId={service.id} label={t('business.newCapability')} />
        </div>
        {linked.length === 0 ? (
          <p className="text-sm text-fg-muted">{t('business.capabilitiesLinkedEmpty')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {linked.map((c) => (
              <li key={c.id} className="flex items-center gap-1 rounded border border-line px-2 py-1 text-sm">
                <RecordLink entity="capability" id={c.id} className="underline-offset-2 hover:underline">{c.name}</RecordLink>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
        <LinkCapabilityControl serviceId={service.id} options={linkable} />
      </section>
    </div>
  );
}
