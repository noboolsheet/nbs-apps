import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

interface ResourceRow {
  id: string;
  name: string;
  type: string;
  status: string;
  hosting: string | null;
  provider: string | null;
  url: string | null;
  credentialLocation: string | null;
}

/** Lista de activos (Fase 8). Columnas alineadas + selección/archivar. Se usa en las fichas de Cliente y Proyecto. */
export function ResourceList({ rows }: { rows: ResourceRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-fg-subtle">{t('resources.empty')}</p>;
  const columns: { header: string; className?: string; cell: (r: ResourceRow) => ReactNode }[] = [
    {
      header: t('field.name'),
      cell: (r) => (
        <RecordLink entity="resource" id={r.id} className="font-medium underline-offset-2 hover:underline">{r.name}</RecordLink>
      ),
    },
    { header: t('field.kind'), cell: (r) => <span className="rounded bg-neutral-soft px-2 py-0.5 text-xs">{r.type}</span> },
    { header: t('field.status'), cell: (r) => <StatusBadge status={r.status} /> },
    { header: t('field.hosting'), cell: (r) => (r.hosting ? <span className="text-xs text-fg-muted">{enumLabel(r.hosting)}</span> : <span className="text-fg-subtle">—</span>) },
    { header: t('field.provider'), cell: (r) => (r.provider ? <span className="text-xs text-fg-muted">{r.provider}</span> : <span className="text-fg-subtle">—</span>) },
    { header: t('resources.linkLabel'), cell: (r) => <ExternalSourceLink url={r.url} label={t('common.open')} /> },
    { header: t('resources.credentialLabel'), cell: (r) => (r.credentialLocation ? <span className="text-xs text-fg-subtle">🔑 {r.credentialLocation}</span> : <span className="text-fg-subtle">—</span>) },
  ];
  return (
    <RecordTable
      columns={columns}
      rows={rows}
      getKey={(r) => r.id}
      selectable
      archive={{ entityType: 'resource' }}
    />
  );
}
