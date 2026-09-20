import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import {
  getOpportunity,
  listClients,
  listContacts,
  listOpportunityTasks,
  getIdentityForInternal,
} from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { RecordTable } from '@/components/ui/record-table';
import { type Column } from '@/components/ui/entity-table';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { TaskStatusControl } from '@/components/projects/forms';
import { OpportunityStageControl } from '@/components/crm/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let opp: Awaited<ReturnType<typeof getOpportunity>>;
  try {
    opp = await getOpportunity(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const [clients, contacts, tasks, identity] = await Promise.all([
    listClients(getDb(), ctx.org),
    listContacts(getDb(), ctx.org),
    listOpportunityTasks(getDb(), ctx.org, id),
    getIdentityForInternal(getDb(), ctx.org, 'opportunity', id),
  ]);
  const crmUrl = (identity?.metadata as { url?: string } | null)?.url ?? null;
  const clientName = opp.clientId ? clients.find((c) => c.id === opp.clientId)?.name : null;
  const contact = opp.primaryContactId ? contacts.find((c) => c.id === opp.primaryContactId) : null;
  const contactName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') : null;
  // Archivada = congelada: no editable y sin poder añadir tareas (se restaura para volver a tocarla).
  const archived = !!opp.archivedAt;
  const frozenHint = t('crm.oportunidadArchivadaDeSoloLecturaRestaur');
  const fmtDate = (d: string | null | undefined) => (d ? formatDate(d) : '—');

  const taskCols: Column<(typeof tasks)[number]>[] = [
    {
      header: t('entity.task'),
      cell: (t) => (
        <RecordLink entity="task" id={t.id} className="font-medium underline-offset-2 hover:underline">{t.title}</RecordLink>
      ),
    },
    { header: t('field.priority'), className: 'w-24', value: (t) => enumLabel(t.priority), cell: (t) => enumLabel(t.priority) },
    {
      header: t('field.status'),
      className: 'w-40',
      cell: (t) => (archived ? <StatusBadge status={t.status} /> : <TaskStatusControl id={t.id} current={t.status} />),
    },
    { header: t('field.dueDate'), className: 'w-32', cell: (t) => <span className="text-xs text-fg-muted">{fmtDate(t.dueDate)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/crm">CRM</Link> /{' '}
        <Link className="hover:underline" href="/crm/opportunities">{t('crm.oportunidades')}</Link> / {opp.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{opp.name}</h1>
        <StatusBadge status={opp.status} />
        <SourceBadge source={identity?.provider ?? 'NATIVE'} url={crmUrl} linkLabel={t('crm.abrirEnElCrm')} />
        {archived && (
          <span className="rounded-full border border-warning-border bg-warning-soft px-2 py-0.5 text-xs text-warning-soft-fg">
            {t('crm.archivadaSoloLectura')}
          </span>
        )}
      </div>

      <Tabs
        tabs={[
          {
            label: t('common.summary'),
            content: (
              <div className="flex flex-col gap-6">
                {/*
                  Owner 2026-09-02: la ficha es de SOLO LECTURA. La oportunidad se crea y se edita en Twenty; lo
                  único que se toca en CT es la etapa (el control de abajo). Antes esto era un `InlineEditSection`
                  con todos los campos editables — ahora sería mentir sobre lo que la app puede hacer.
                */}
                <DescriptionList
                  items={[
                    { label: t('field.name'), value: opp.name },
                    { label: t('entity.client'), value: clientName ?? null },
                    { label: t('field.primaryContactId'), value: contactName || null },
                    { label: t('field.estimatedValue'), value: opp.estimatedValue ? `${opp.estimatedValue} ${opp.currencyCode ?? ''}`.trim() : null },
                    { label: t('crm.cierreEstimado'), value: opp.expectedCloseDate ? formatDate(opp.expectedCloseDate) : null },
                    { label: t('field.source'), value: opp.source },
                    { label: t('field.notes'), value: opp.notes ? <span className="whitespace-pre-wrap">{opp.notes}</span> : null },
                  ]}
                />

                <section className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-fg-muted">{t('crm.etapa')}</span>
                    {archived ? <StatusBadge status={opp.stage} /> : <OpportunityStageControl id={opp.id} current={opp.stage} />}
                  </div>
                  <p className="text-xs text-fg-subtle">{archived ? frozenHint : t('crm.soloLaEtapaSeEditaAqui')}</p>
                  <DescriptionList
                    items={[
                      {
                        label: t('crm.verCliente'),
                        value: opp.clientId ? (
                          <Link className="underline underline-offset-2" href={`/crm/clients/${opp.clientId}`}>
                            {clientName ?? opp.clientId.slice(0, 8) + '…'}
                          </Link>
                        ) : null,
                      },
                      {
                        label: t('crm.verContacto'),
                        value: opp.primaryContactId ? (
                          <Link className="underline underline-offset-2" href={`/crm/contacts/${opp.primaryContactId}`}>
                            {contactName || opp.primaryContactId.slice(0, 8) + '…'}
                          </Link>
                        ) : null,
                      },
                      { label: t('crm.cerrada'), value: opp.closedAt ? formatDateTime(opp.closedAt) : null },
                      { label: t('crm.archivada'), value: opp.archivedAt ? formatDateTime(opp.archivedAt) : null },
                      { label: t('crm.fuenteDeVerdad'), value: <SourceBadge source={identity?.provider ?? 'NATIVE'} url={crmUrl} linkLabel={t('crm.abrirEnElCrm')} /> },
                      { label: t('crm.creada'), value: formatDateTime(opp.createdAt) },
                    ]}
                  />
                </section>
              </div>
            ),
          },
          {
            label: `Tareas (${tasks.length})`,
            content: (
              <div className="flex flex-col gap-3">
                {!archived && (
                  <div className="flex justify-end">
                    <ContextNewButton entity="task" ctxKey="opportunity" parentId={opp.id} label={t('projects.newTask')} />
                  </div>
                )}
                {tasks.length === 0 ? (
                  <EmptyState
                    title={t('projects.tasksEmpty')}
                    hint={archived ? t('crm.laOportunidadEstaArchivada') : t('crm.creaLaPrimeraConElBotonNuevaTareaUtilPar')}
                  />
                ) : (
                  <RecordTable
                    columns={taskCols}
                    rows={tasks}
                    getKey={(t) => t.id}
                    selectable
                    remove={{ entityType: 'task' }}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
