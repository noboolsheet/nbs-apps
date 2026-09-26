import type { ReactNode } from 'react';
import Link from 'next/link';
import { getDb } from '@ct/db';
import { listOpportunities, listArchivedOpportunities, listClients, listIdentitiesByInternalType } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';
import { SourceBadge } from '@/components/ui/source-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable } from '@/components/ui/data-table';
import { Tabs } from '@/components/ui/tabs';
import { OpportunityStageControl } from '@/components/crm/forms';
import { RecordLink } from '@/components/ui/record-link';
import { OpportunityBoard } from '@/components/crm/opportunity-board';
import { OPPORTUNITY_COLUMNS } from '@/lib/opportunity-columns';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  return formatDate(d);
}

export default async function OpportunitiesPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, archived, clients, identities] = await Promise.all([
    listOpportunities(db, ctx.org),
    listArchivedOpportunities(db, ctx.org),
    listClients(db, ctx.org),
    listIdentitiesByInternalType(db, ctx.org, 'opportunity'),
  ]);
  const clientById = new Map(clients.map((c) => [c.id, c.name]));
  const providerByOpp = new Map(identities.map((i) => [i.internalId, i.provider]));
  const clientName = (id: string | null) => (id ? (clientById.get(id) ?? '—') : t('crm.noClient'));
  const money = (v: string | null, cur: string | null) => (v ? `${v} ${cur ?? ''}`.trim() : '—');

  // ─── Vista ACTIVAS: el Kanban de 4 columnas ──────────────────────────────────────────────────────────
  const activas: ReactNode =
    rows.length === 0 ? (
      <EmptyState title={t('crm.opportunitiesEmpty')} hint={t('crm.opportunitiesFromTwentyHint')} />
    ) : (
      // E-12/B-1: el tablero es un componente cliente para poder ARRASTRAR las cards entre columnas; el
      // contenido de cada card se sigue renderizando en el servidor y se le pasa como `content`.
      <OpportunityBoard
        columns={OPPORTUNITY_COLUMNS}
        cards={rows.map((o) => ({
          id: o.id,
          stage: o.stage,
          content: (
            <>
              {/* Etiqueta del stage exacto: diferencia cards dentro de la misma columna. */}
              <StatusBadge status={o.stage} />
              <RecordLink entity="opportunity" id={o.id} className="font-medium underline-offset-2 hover:underline">
                {o.name}
              </RecordLink>
              <div className="text-xs text-fg-muted">
                {clientName(o.clientId)}
                {o.estimatedValue ? ` · ${o.estimatedValue} ${o.currencyCode ?? ''}` : ''}
              </div>
              <SourceBadge source={providerByOpp.get(o.id) ?? 'NATIVE'} />
              {/* Ruta accesible (teclado) y alternativa al arrastre. */}
              <OpportunityStageControl id={o.id} current={o.stage} />
            </>
          ),
        }))}
      />
    );

  // ─── Vista ARCHIVADAS: lista de oportunidades cerradas y retiradas del tablero (restaurables) ─────────
  const archivadasColumns = [
    { header: t('entity.opportunity'), className: '' },
    { header: t('entity.client'), className: 'w-48' },
    { header: t('field.status'), className: 'w-40' },
    { header: t('crm.amount'), className: 'w-32' },
    { header: t('crm.closedAt'), className: 'w-32' },
    { header: t('crm.archivedAt'), className: 'w-32' },
  ];
  const archivadas: ReactNode =
    archived.length === 0 ? (
      <EmptyState
        title={t('crm.opportunitiesArchivedEmpty')}
        hint={t('crm.opportunitiesArchivedHint')}
      />
    ) : (
      <DataTable
        columns={archivadasColumns.map(({ header, className }) => ({ header, className }))}
        rows={archived.map((o) => ({
          id: o.id,
          cells: [
            <RecordLink key="n" entity="opportunity" id={o.id} className="font-medium underline-offset-2 hover:underline">
              {o.name}
            </RecordLink>,
            <span key="c" className="text-fg-muted">{clientName(o.clientId)}</span>,
            <StatusBadge key="s" status={o.stage} />,
            <span key="v" className="text-fg-muted">{money(o.estimatedValue, o.currencyCode)}</span>,
            <span key="cl" className="text-xs text-fg-muted">{fmtDate(o.closedAt)}</span>,
            <span key="a" className="text-xs text-fg-muted">{fmtDate(o.archivedAt)}</span>,
          ],
        }))}
        selectable
        restore={{ entityType: 'opportunity' }}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/crm">CRM</Link> / {t('crm.opportunitiesTitle')}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{t('crm.opportunitiesTitle')}</h1>

      <Tabs
        tabs={[
          { label: `Activas (${rows.length})`, content: activas },
          { label: `Archivadas (${archived.length})`, content: archivadas },
        ]}
        actions={
          <Link href="/crm/opportunities/tasks" className="text-sm text-link underline-offset-2 hover:underline">
            {t('crm.viewTasksLink')}
          </Link>
        }
      />
    </div>
  );
}
