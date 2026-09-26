import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getResource, listProjects, listClients } from '@ct/application';
import { RESOURCE_STATUS, RESOURCE_HOSTING } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let resource: Awaited<ReturnType<typeof getResource>>;
  try {
    resource = await getResource(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const [clients, projects] = await Promise.all([
    listClients(getDb(), ctx.org),
    listProjects(getDb(), ctx.org),
  ]);
  const client = resource.clientId ? clients.find((c) => c.id === resource.clientId) : null;
  const project = resource.projectId ? projects.find((p) => p.id === resource.projectId) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">Activos / {resource.name}</nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{resource.name}</h1>
        <StatusBadge status={resource.status} />
        <span className="rounded bg-neutral-soft px-2 py-0.5 text-xs">{resource.type}</span>
      </div>

      <InlineEditSection
        title={t('entity.resource')}
        endpoint={`/api/v1/resources/${resource.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: resource.name },
          { name: 'type', label: t('field.kind'), type: 'text', value: resource.type },
          { name: 'status', label: t('field.status'), type: 'select', options: RESOURCE_STATUS, value: resource.status },
          { name: 'hosting', label: t('field.hosting'), type: 'select', options: RESOURCE_HOSTING, value: resource.hosting },
          { name: 'provider', label: t('field.provider'), type: 'text', value: resource.provider },
          { name: 'environment', label: t('field.environment'), type: 'text', value: resource.environment },
          { name: 'url', label: 'URL', type: 'text', value: resource.url },
          { name: 'credentialLocation', label: t('resources.credentialPointerLabel'), type: 'text', value: resource.credentialLocation },
          { name: 'notes', label: t('field.notes'), type: 'textarea', value: resource.notes },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ExternalSourceLink url={resource.url} label={t('knowledge.openResource')} />
        </div>
        <DescriptionList
          items={[
            {
              label: t('entity.client'),
              value: client ? (
                <Link className="underline underline-offset-2" href={`/crm/clients/${client.id}`}>{client.name}</Link>
              ) : null,
            },
            {
              label: t('entity.project'),
              value: project ? (
                <Link className="underline underline-offset-2" href={`/projects/${project.id}`}>{project.name}</Link>
              ) : null,
            },
            { label: t('meta.sourceOfTruth'), value: t('resources.nativeSource') },
            { label: t('meta.createdAt'), value: formatDateTime(resource.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
