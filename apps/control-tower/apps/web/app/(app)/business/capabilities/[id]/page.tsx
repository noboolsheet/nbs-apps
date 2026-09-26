import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getCapability } from '@ct/application';
import { CAPABILITY_MATURITY } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { StatusControl } from '@/components/business/forms';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function CapabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let capability: Awaited<ReturnType<typeof getCapability>>;
  try {
    capability = await getCapability(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> /{' '}
        <Link className="hover:underline" href="/business/capabilities">{t('business.capabilitiesTitle')}</Link> / {capability.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{capability.name}</h1>
        <StatusBadge status={capability.maturity} />
      </div>

      <InlineEditSection
        title={t('entity.capability')}
        endpoint={`/api/v1/capabilities/${capability.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: capability.name },
          { name: 'description', label: t('field.description'), type: 'textarea', value: capability.description },
          { name: 'maturity', label: t('field.maturity'), type: 'select', options: CAPABILITY_MATURITY, value: capability.maturity },
          { name: 'notes', label: t('field.notes'), type: 'textarea', value: capability.notes },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('common.statusLabel')}</span>
          <StatusControl kind="capabilities" id={capability.id} current={capability.status} />
        </div>
        <DescriptionList
          items={[
            { label: t('meta.sourceOfTruth'), value: t('business.capabilityNativeSource') },
            { label: t('meta.createdAtFem'), value: formatDateTime(capability.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
