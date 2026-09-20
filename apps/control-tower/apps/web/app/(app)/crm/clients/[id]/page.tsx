import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getClientDetail, listDocuments, getIdentityForInternal, listProjects, listResourcesByClient } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { ResourceList } from '@/components/resources/resource-list';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { OpportunityStageControl, ClientStatusControl } from '@/components/crm/forms';
import { CreateDocumentForm } from '@/components/knowledge/forms';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';
import { enumLabel } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let detail: Awaited<ReturnType<typeof getClientDetail>>;
  try {
    detail = await getClientDetail(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const { client, contacts, opportunities } = detail;
  // Independientes → en paralelo (antes eran 4 await en serie). La "fuente de verdad" (identity) es nativo
  // salvo que exista identidad externa (Twenty); sin pull, solo lo ya sincronizado.
  const db = getDb();
  const [documents, clientProjects, clientResources, identity] = await Promise.all([
    listDocuments(db, ctx.org, { clientId: client.id }),
    listProjects(db, ctx.org, { clientId: client.id }),
    listResourcesByClient(db, ctx.org, client.id),
    getIdentityForInternal(db, ctx.org, 'client', client.id),
  ]);
  const crmUrl = (identity?.metadata as { url?: string } | null)?.url ?? null;

  const contactCols: Column<(typeof contacts)[number]>[] = [
    {
      header: t('field.name'),
      cell: (c) => (
        <RecordLink entity="contact" id={c.id} className="font-medium underline-offset-2 hover:underline">
          {[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}
        </RecordLink>
      ),
    },
    { header: t('field.email'), cell: (c) => c.email ?? '—' },
    { header: t('field.jobTitle'), cell: (c) => c.jobTitle ?? '—' },
  ];
  const oppCols: Column<(typeof opportunities)[number]>[] = [
    {
      header: t('entity.opportunity'),
      value: (o) => o.name,
      cell: (o) => (
        <RecordLink entity="opportunity" id={o.id} className="font-medium underline-offset-2 hover:underline">
          {o.name}
        </RecordLink>
      ),
    },
    { header: t('field.stage'), cell: (o) => <OpportunityStageControl id={o.id} current={o.stage} /> },
    { header: t('field.status'), value: (o) => enumLabel(o.status), cell: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/crm">CRM</Link> /{' '}
        <Link className="hover:underline" href="/crm/clients">{t('home.metricClients')}</Link> / {client.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <StatusBadge status={client.status} />
        <ClientStatusControl id={client.id} current={client.status} />
        <SourceBadge source={identity?.provider ?? 'NATIVE'} url={crmUrl} linkLabel={t('crm.abrirEnElCrm')} />
      </div>

      <Tabs
        tabs={[
          {
            label: t('common.summary'),
            content: (
              <div className="flex flex-col gap-1 text-sm text-fg-muted">
                <div>Industria: {client.industry ?? '—'}</div>
                <div>Web: {client.websiteUrl ?? '—'}</div>
                <div>Contactos: {contacts.length} · Oportunidades: {opportunities.length}</div>
                {identity ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Fuente: {identity.provider}</span>
                    <span className="text-fg-subtle">· id externo {identity.externalId}</span>
                    {crmUrl ? (
                      <a href={crmUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">
                        {t('crm.abrirEnElCrm2')}
                      </a>
                    ) : (
                      <span className="text-fg-subtle">{t('crm.configuraLaUrlDeTwentyEnLaIntegracionPar')}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-fg-subtle">{t('crm.nativeClient')}</div>
                )}
              </div>
            ),
          },
          {
            label: `Contactos (${contacts.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="contact" ctxKey="client" parentId={client.id} label={t('crm.nuevoContacto')} />
                </div>
                {contacts.length === 0 ? (
                  <EmptyState title={t('crm.sinContactos')} />
                ) : (
                  <RecordTable
                    columns={contactCols}
                    rows={contacts}
                    getKey={(c) => c.id}
                    selectable
                    archive={{ entityType: 'contact' }}
                  />
                )}
              </div>
            ),
          },
          {
            label: `Oportunidades (${opportunities.length})`,
            content: (
              <div className="flex flex-col gap-3">
                {/* Sin botón de crear: las oportunidades nacen en Twenty (owner 2026-09-02). */}
                {opportunities.length === 0 ? (
                  <EmptyState title={t('crm.sinOportunidades')} hint={t('crm.oportunidadesVienenDeTwenty')} />
                ) : (
                  <RecordTable
                    columns={oppCols}
                    rows={opportunities}
                    getKey={(o) => o.id}
                    selectable
                    archive={{ entityType: 'opportunity' }}
                  />
                )}
              </div>
            ),
          },
          {
            label: `Proyectos (${clientProjects.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="project" ctxKey="client" parentId={client.id} label={t('crm.nuevoProyecto')} />
                </div>
                {clientProjects.length === 0 ? (
                  <EmptyState title={t('crm.sinProyectos')} hint={t('crm.creaUnoConNuevoProyectoQuedaAsignadoAEst')} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {clientProjects.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 rounded border border-line px-3 py-2 text-sm">
                        <RecordLink entity="project" id={p.id} className="font-medium underline-offset-2 hover:underline">{p.name}</RecordLink>
                        <span className="flex items-center gap-2">
                          <StatusBadge status={p.status} />
                          <ProgressBar value={p.progress} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            label: `Activos (${clientResources.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <ContextNewButton entity="resource" ctxKey="client" parentId={client.id} label={t('resources.new')} />
                </div>
                <p className="text-xs text-fg-muted">{t('crm.incluyeLosActivosPersonalesDelClienteYLo')}</p>
                <ResourceList rows={clientResources} />
              </div>
            ),
          },
          {
            label: `Documentos (${documents.length})`,
            content: (
              <div className="flex flex-col gap-3">
                <CreateDocumentForm clientId={client.id} />
                {documents.length === 0 ? (
                  <EmptyState title={t('documents.empty')} hint={t('crm.guardaReferenciasExternasDriveNotion')} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm">
                        <span>{doc.name}</span>
                        <SourceBadge source={doc.externalProvider} url={doc.externalUrl} linkLabel={t('common.open')} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
