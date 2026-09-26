import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getDocument, listProjects, listClients } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let doc: Awaited<ReturnType<typeof getDocument>>;
  try {
    doc = await getDocument(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const [projects, clients] = await Promise.all([
    listProjects(getDb(), ctx.org),
    listClients(getDb(), ctx.org),
  ]);
  const project = doc.projectId ? projects.find((p) => p.id === doc.projectId) : null;
  const client = doc.clientId ? clients.find((c) => c.id === doc.clientId) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> /{' '}
        <Link className="hover:underline" href="/knowledge/documents">{t('documents.title')}</Link> / {doc.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{doc.name}</h1>
        <StatusBadge status={doc.status} />
      </div>

      {/* Referencia de solo lectura: el contenido vive en Drive/Notion, nunca en CT. */}
      <div className="rounded border border-line bg-surface-muted px-4 py-3 text-sm/40">
        <p className="mb-2 text-fg-muted">
          Este documento es una <strong>referencia</strong>. Para ver o editar su contenido, ábrelo en su origen.
        </p>
        <SourceBadge source={doc.externalProvider} url={doc.externalUrl} linkLabel={t('knowledge.openSourceLink')} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('knowledge.detailsTitle')}</h2>
        <DescriptionList
          items={[
            { label: t('knowledge.documentTypeLabel'), value: doc.documentType ?? null },
            { label: 'MIME', value: doc.mimeType ?? null },
            { label: t('field.provider'), value: doc.externalProvider ?? null },
            {
              label: t('entity.project'),
              value: project ? (
                <Link className="underline underline-offset-2" href={`/projects/${project.id}`}>{project.name}</Link>
              ) : null,
            },
            {
              label: t('entity.client'),
              value: client ? (
                <Link className="underline underline-offset-2" href={`/crm/clients/${client.id}`}>{client.name}</Link>
              ) : null,
            },
            { label: t('meta.createdAt'), value: formatDateTime(doc.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
