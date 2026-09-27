import { SourceBadge } from '@/components/ui/source-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { type Column } from '@/components/ui/entity-table';
import { singleExternalUrl } from '@/lib/external-url';
import { KnowledgeItemStatusControl } from '@/components/knowledge/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export interface LibraryRow {
  id: string;
  title: string;
  knowledgeType: string;
  sector: string | null;
  status: string;
  sourceType: string;
  sourceUrl: string | null;
  /** URL de la página espejo en Notion (de `external_identities`), si el ítem está sincronizado. */
  notionUrl?: string | null;
}

/**
 * Biblioteca de conocimiento.
 *
 * Filtra con las **facetas** de `RecordTable` (Sector, Tipo, Estado), como el resto de las listas. Antes tenía sus
 * propios desplegables y su propio `<table>`: eso la dejó fuera de la ordenación por columna y del buscador de F-28,
 * y era una segunda forma de filtrar que había que mantener aparte. Al ser ya un componente de servidor, además
 * desaparece el `'use client'` que sólo existía para el estado de esos desplegables.
 *
 * `lockedType` = la lista ya viene acotada a un tipo desde el servidor (**Negocio › Procesos**): ahí la columna de
 * tipo no se muestra, porque tendría un único valor.
 */
export function LibraryList({ items, lockedType = false }: { items: LibraryRow[]; lockedType?: boolean }) {
  const columns: Column<LibraryRow>[] = [
    {
      header: t('entity.knowledge_item'),
      value: (r) => r.title,
      cell: (r) => (
        <RecordLink entity="knowledge_item" id={r.id} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </RecordLink>
      ),
    },
    ...(lockedType
      ? []
      : [
          {
            header: t('field.kind'),
            value: (r: LibraryRow) => enumLabel(r.knowledgeType),
            facet: true,
            cell: (r: LibraryRow) => enumLabel(r.knowledgeType),
          },
        ]),
    { header: t('field.sector'), value: (r) => r.sector, facet: true, cell: (r) => r.sector ?? <span className="text-fg-subtle">—</span> },
    // Fuente = SÓLO la procedencia. El enlace vive en su propia columna: el badge decía «Notion» y llevaba a
    // Drive, que es justo lo contrario de lo que promete.
    { header: t('field.sourceType'), value: (r) => r.sourceType, facet: true, cell: (r) => <SourceBadge source={r.sourceType} /> },
    { header: t('field.link'), cell: (r) => <RowLink row={r} /> },
    // Control interactivo, pero con `value` para que se pueda ordenar y **facetar** por estado.
    {
      header: t('field.status'),
      value: (r) => enumLabel(r.status),
      facet: true,
      cell: (r) => <KnowledgeItemStatusControl id={r.id} current={r.status} />,
    },
  ];

  return (
    <RecordTable
      columns={columns}
      rows={items}
      getKey={(r) => r.id}
      empty={{ title: t('knowledge.libraryEmpty'), hint: t('knowledge.libraryEmptyHint') }}
    />
  );
}

/**
 * Enlace de la fila: la url relacionada (la carpeta de Drive del SOP, típicamente). Si el campo trae **varias**
 * —es texto libre a propósito— no hay un destino único, así que cae a la página de Notion, que siempre lo es.
 * Las urls completas se ven igual en la ficha y en el panel; aquí sólo hace falta una puerta de entrada.
 */
function RowLink({ row }: { row: LibraryRow }) {
  const url = singleExternalUrl(row.sourceUrl);
  if (url) return <ExternalSourceLink url={url} label={t('knowledge.openSource')} />;
  if (row.notionUrl) return <ExternalSourceLink url={row.notionUrl} label={t('knowledge.openInNotion')} />;
  return <span className="text-fg-subtle">—</span>;
}
