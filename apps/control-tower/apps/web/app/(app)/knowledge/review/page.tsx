import { getDb } from '@ct/db';
import { listReviewItems , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ListPage } from '@/components/ui/list-page';
import { Tabs } from '@/components/ui/tabs';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { ReviewItemStatusControl } from '@/components/knowledge/forms';
import { StatusBadge } from '@/components/ui/status-badge';
import { enumLabel } from '@/lib/labels';
import { formatDate } from '@/lib/i18n/format';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type ReviewItem = Awaited<ReturnType<typeof listReviewItems>>[number];

export default async function ReviewQueuePage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listReviewItems(getDb(), ctx.org, undefined, LIST_LIMIT);
  // Pendiente = todo lo que no está revisado ni descartado (incluye lo que ya se está leyendo).
  const pending = rows.filter((r) => r.status === 'TO_REVIEW' || r.status === 'REVIEWING');
  const done = rows.filter((r) => r.status === 'REVIEWED' || r.status === 'DISCARDED');

  const columns: Column<ReviewItem>[] = [
    {
      header: t('field.title'),
      value: (r) => r.title,
      cell: (r) => (
        <RecordLink entity="review_item" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </RecordLink>
      ),
    },
    { header: t('field.kind'), className: 'w-32', value: (r) => enumLabel(r.kind ?? '') || null, cell: (r) => enumLabel(r.kind ?? '') || '—' },
    { header: t('field.sector'), className: 'w-36', value: (r) => r.sector, cell: (r) => r.sector ?? '—' },
    { header: t('review.addedAt'), className: 'w-32', value: (r) => r.createdAt, cell: (r) => formatDate(r.createdAt) },
    {
      header: t('field.status'),
      className: 'w-44',
      value: (r) => enumLabel(r.status),
      // Revisado = terminal (`isReviewItemFrozen`): se pinta como insignia, no como desplegable. Ofrecer un
      // selector que el servidor va a rechazar es peor que no ofrecerlo.
      cell: (r) =>
        r.status === 'REVIEWED' ? (
          <StatusBadge status={r.status} />
        ) : (
          <ReviewItemStatusControl id={r.id} current={r.status} />
        ),
    },
    // El enlace, en su propia columna al final: es la acción que se busca, no parte del nombre.
    {
      header: t('field.url'),
      className: 'w-24',
      cell: (r) =>
        r.url ? (
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-link underline-offset-2 hover:underline"
          >
            {t('common.open')} ↗
          </a>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ];

  const table = (list: ReviewItem[], emptyTitle: string, emptyHint?: string) => (
    <RecordTable
      columns={columns}
      rows={list}
      getKey={(r) => r.id}
      truncatedAt={LIST_LIMIT}
      empty={{ title: emptyTitle, hint: emptyHint }}
      selectable
      archive={{ entityType: 'review_item' }}
      fixedLayout
    />
  );

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.knowledge'), href: '/knowledge' }]}
      title={t('review.title')}
      action={<NewRecordButton entity="review_item" />}
    >
      <Tabs
        tabs={[
          {
            label: `${t('review.tabPending')} (${pending.length})`,
            content: table(pending, t('review.emptyPending'), t('review.emptyPendingHint')),
          },
          { label: `${t('review.tabDone')} (${done.length})`, content: table(done, t('review.emptyDone')) },
        ]}
      />
    </ListPage>
  );
}
