import { StatusBadge } from '@/components/ui/status-badge';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { type Column } from '@/components/ui/entity-table';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export interface LearningRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  sector: string | null;
  url: string | null;
}

/**
 * Ruta de aprendizaje. Filtra con las **facetas** de `RecordTable` (Sector, Tipo, Estado) como el resto de las
 * listas; antes tenía tres desplegables propios y su propio `<table>`, y por eso se había quedado sin ordenación ni
 * buscador. Al no necesitar estado de cliente, vuelve a ser un componente de servidor.
 */
export function LearningList({ items }: { items: LearningRow[] }) {
  const columns: Column<LearningRow>[] = [
    {
      header: t('field.title'),
      value: (r) => r.title,
      cell: (r) => (
        <RecordLink entity="learning" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </RecordLink>
      ),
    },
    { header: t('field.kind'), value: (r) => r.kind, facet: true, cell: (r) => r.kind },
    { header: t('field.sector'), value: (r) => r.sector, facet: true, cell: (r) => r.sector ?? <span className="text-fg-subtle">—</span> },
    { header: t('field.status'), value: (r) => enumLabel(r.status), facet: true, cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: t('entity.resource'),
      // El enlace usa `ExternalSourceLink`: aquí estaba escrito a mano con `text-blue-600 dark:text-blue-400`,
      // que se salta los tokens del tema (DESIGN_TOKENS: nada de `dark:` a mano).
      cell: (r) => (r.url ? <ExternalSourceLink url={r.url} label={t('common.open')} /> : <span className="text-fg-subtle">—</span>),
    },
  ];

  return (
    <RecordTable
      columns={columns}
      rows={items}
      getKey={(r) => r.id}
      empty={{ title: t('knowledge.learningEmpty'), hint: t('knowledge.learningEmptyHint') }}
    />
  );
}
