import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getDeliverable, listProjects } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { DeliverableStatusControl } from '@/components/projects/forms';
import { t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function DeliverableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let deliverable: Awaited<ReturnType<typeof getDeliverable>>;
  try {
    deliverable = await getDeliverable(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const projects = await listProjects(getDb(), ctx.org);
  const project = deliverable.projectId ? projects.find((p) => p.id === deliverable.projectId) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/projects">{t('nav.projects')}</Link> /{' '}
        {project ? (
          <>
            <Link className="hover:underline" href={`/projects/${project.id}`}>{project.name}</Link> /{' '}
          </>
        ) : null}
        {deliverable.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{deliverable.name}</h1>
        <StatusBadge status={deliverable.status} />
      </div>

      <InlineEditSection
        title={t('entity.deliverable')}
        endpoint={`/api/v1/deliverables/${deliverable.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: deliverable.name },
          { name: 'description', label: t('field.description'), type: 'textarea', value: deliverable.description },
          {
            name: 'dueDate',
            label: t('deliverables.dueDateLabel'),
            type: 'date',
            value: deliverable.dueDate,
            display: deliverable.dueDate ? formatDate(deliverable.dueDate) : null,
          },
          { name: 'externalUrl', label: t('deliverables.externalLinkLabel'), type: 'text', value: deliverable.externalUrl },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('common.statusLabel')}</span>
          <DeliverableStatusControl id={deliverable.id} current={deliverable.status} />
          <ExternalSourceLink url={deliverable.externalUrl} />
        </div>
        <DescriptionList
          items={[
            {
              label: t('entity.project'),
              value: project ? (
                <Link className="underline underline-offset-2" href={`/projects/${project.id}`}>{project.name}</Link>
              ) : null,
            },
            { label: t('common.completedAt'), value: deliverable.completedAt ? formatDateTime(deliverable.completedAt) : null },
            { label: t('meta.sourceOfTruth'), value: t('deliverables.nativeSource') },
            { label: t('meta.createdAt'), value: formatDateTime(deliverable.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
