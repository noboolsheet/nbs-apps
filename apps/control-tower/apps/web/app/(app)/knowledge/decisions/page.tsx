import { getDb } from '@ct/db';
import { listDecisions , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ListPage } from '@/components/ui/list-page';
import { DecisionStatusControl } from '@/components/knowledge/forms';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Decision = Awaited<ReturnType<typeof listDecisions>>[number];

export default async function DecisionsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listDecisions(getDb(), ctx.org, undefined, LIST_LIMIT);
  // A-2 (ADR-006): la cadena de reemplazo se resuelve en memoria con las filas ya cargadas (la relación es
  // decisión→decisión dentro de la misma lista, así que no hace falta otra query).
  const titleById = new Map(rows.map((r) => [r.id, r.title]));
  const supersededBy = new Map<string, string>();
  for (const r of rows) if (r.supersedesDecisionId) supersededBy.set(r.supersedesDecisionId, r.id);

  const columns: Column<Decision>[] = [
    {
      header: t('entity.decision'),
      value: (r) => r.title,
      cell: (r) => (
        <RecordLink entity="decision" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </RecordLink>
      ),
    },
    { header: t('knowledge.detailLink'), value: (r) => r.decision, cell: (r) => <span className="line-clamp-1 text-fg-muted">{r.decision}</span> },
    {
      header: t('knowledge.chainLink'),
      className: 'w-56',
      cell: (r) => {
        const olderId = r.supersedesDecisionId;
        const newerId = supersededBy.get(r.id);
        if (!olderId && !newerId) return <span className="text-fg-subtle">—</span>;
        return (
          <span className="flex flex-col gap-0.5 text-xs">
            {olderId && (
              <span className="text-fg-muted">
                {t('knowledge.supersedes')}{' '}
                <RecordLink entity="decision" id={olderId} className="underline-offset-2 hover:underline">
                  {titleById.get(olderId) ?? t('knowledge.decisionFallback')}
                </RecordLink>
              </span>
            )}
            {newerId && (
              <span className="text-fg-muted">
                {t('knowledge.supersededBy')}{' '}
                <RecordLink entity="decision" id={newerId} className="underline-offset-2 hover:underline">
                  {titleById.get(newerId) ?? t('knowledge.decisionFallback')}
                </RecordLink>
              </span>
            )}
          </span>
        );
      },
    },
    { header: t('field.status'), cell: (r) => <DecisionStatusControl id={r.id} current={r.status} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.knowledge'), href: '/knowledge' }]}
      title={t('decisions.title')}
      count={rows.length}
      action={<NewRecordButton entity="decision" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{ title: t('knowledge.decisionsEmpty'), hint: t('knowledge.decisionsEmptyHint') }}
        selectable
        archive={{ entityType: 'decision' }}
      />
    </ListPage>
  );
}
