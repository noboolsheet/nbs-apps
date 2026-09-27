import Link from 'next/link';
import { getDb } from '@ct/db';
import { listDocuments , LIST_LIMIT } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { SourceBadge } from '@/components/ui/source-badge';
import { ListPage } from '@/components/ui/list-page';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Doc = Awaited<ReturnType<typeof listDocuments>>[number];

export default async function DocumentsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listDocuments(getDb(), ctx.org, undefined, LIST_LIMIT);

  const columns: Column<Doc>[] = [
    {
      header: t('knowledge.documentBadge'),
      value: (r) => r.name,
      cell: (r) => (
        <Link className="font-medium underline-offset-2 hover:underline" href={`/knowledge/documents/${r.id}`}>
          {r.name}
        </Link>
      ),
    },
    // La columna «Tipo» se retiró (owner 2026-09-27): repetía lo que ya dice el nombre del fichero (su extensión) y
    // el badge de procedencia, y ocupaba ancho útil. El dato sigue en la ficha del documento.
    { header: t('field.sourceType'), value: (r) => r.externalProvider, cell: (r) => <SourceBadge source={r.externalProvider} url={r.externalUrl} linkLabel={t('knowledge.openInDrive')} /> },
  ];

  return (
    <ListPage
      breadcrumb={[{ label: t('nav.knowledge'), href: '/knowledge' }]}
      title={t('documents.title')}
      count={rows.length}
    >
      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        truncatedAt={LIST_LIMIT}
        empty={{ title: t('knowledge.documentsEmpty'), hint: t('knowledge.documentsEmptyHint') }}
        selectable
        archive={{ entityType: 'document' }}
      />
    </ListPage>
  );
}
