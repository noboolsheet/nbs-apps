import { getDb } from '@ct/db';
import { listPortfolioItems , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { ListPage } from '@/components/ui/list-page';
import { SourceBadge } from '@/components/ui/source-badge';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Item = Awaited<ReturnType<typeof listPortfolioItems>>[number];

export default async function PortfolioPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listPortfolioItems(getDb(), ctx.org, LIST_LIMIT);

  const columns: Column<Item>[] = [
    {
      header: t('knowledge.itemBadge'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="portfolio_item" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.kind'), value: (r) => enumLabel(r.type), cell: (r) => enumLabel(r.type) },
    { header: t('field.status'), value: (r) => enumLabel(r.status), cell: (r) => <StatusBadge status={r.status} /> },
    { header: t('field.visibility'), value: (r) => enumLabel(r.visibility), cell: (r) => enumLabel(r.visibility) },
    { header: t('field.sourceType'), cell: (r) => <SourceBadge source="NATIVE" url={r.externalUrl} linkLabel={t('common.open')} /> },
  ];

  return (
    <ListPage
      title={t('nav.portfolio')}
      count={rows.length}
      action={<NewRecordButton entity="portfolio_item" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{ title: t('portfolio.empty'), hint: t('common.createFirstHint') }}
        selectable
        archive={{ entityType: 'portfolio_item' }}
      />
    </ListPage>
  );
}
