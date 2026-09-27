import { getDb } from '@ct/db';
import { listAssets, listIdentitiesByInternalType, LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ListPage } from '@/components/ui/list-page';
import { SourceBadge } from '@/components/ui/source-badge';
import { AssetStatusControl } from '@/components/knowledge/forms';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Asset = Awaited<ReturnType<typeof listAssets>>[number];

export default async function AssetsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  // La procedencia se resuelve de verdad: esta lista pintaba `NATIVE` para TODOS, así que un repo importado de
  // GitHub se presentaba como nativo de CT. Con esto el badge dice la verdad y la faceta de origen sirve de algo.
  const [rows, identities] = await Promise.all([
    listAssets(db, ctx.org, LIST_LIMIT),
    listIdentitiesByInternalType(db, ctx.org, 'asset'),
  ]);
  const providerByAsset = new Map(identities.map((i) => [i.internalId, i.provider]));

  const columns: Column<Asset>[] = [
    {
      header: t('entity.asset'),
      value: (r) => r.name,
      cell: (r) => (
        <RecordLink entity="asset" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.name}
        </RecordLink>
      ),
    },
    { header: t('field.kind'), value: (r) => r.assetType, facet: true, cell: (r) => r.assetType },
    { header: t('field.version'), cell: (r) => r.version ?? '—' },
    {
      header: t('field.sourceType'),
      value: (r) => providerByAsset.get(r.id) ?? 'NATIVE',
      facet: true,
      cell: (r) => (
        <SourceBadge
          source={providerByAsset.get(r.id) ?? 'NATIVE'}
          url={r.externalUrl ?? r.repositoryUrl}
          linkLabel={r.externalUrl ? t('common.open') : r.repositoryUrl ? t('field.repositoryUrl') : undefined}
        />
      ),
    },
    { header: t('field.status'), value: (r) => enumLabel(r.status), facet: true, cell: (r) => <AssetStatusControl id={r.id} current={r.status} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.knowledge'), href: '/knowledge' }]}
      title={t('knowledge.assetsTitle')}
      count={rows.length}
      action={<NewRecordButton entity="asset" />}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{ title: t('knowledge.assetsEmpty'), hint: t('knowledge.assetsEmptyHint') }}
        selectable
        archive={{ entityType: 'asset' }}
      />
    </ListPage>
  );
}
