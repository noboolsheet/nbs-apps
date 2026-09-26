'use client';

import { useMemo, useState } from 'react';
import { SourceBadge } from '@/components/ui/source-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { type Column } from '@/components/ui/entity-table';
import { singleExternalUrl } from '@/lib/external-url';
import { KnowledgeItemStatusControl } from '@/components/knowledge/forms';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';
import { btnLink } from '@/components/ui/button';
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

const selCls = fieldCls;

/**
 * Library con filtros por sector y tipo (cliente, sobre las filas ya cargadas).
 *
 * La tabla es **`RecordTable`**, la misma que las otras 19 vistas. Antes esta lista pintaba su propio `<table>`
 * a mano y, por eso, se quedó fuera de F-28: no tenía ordenación por columna, ni filtro rápido, ni aviso de tope.
 * Los desplegables de sector/tipo se conservan porque hacen algo distinto del filtro de texto: acotan por un
 * valor exacto de un conjunto cerrado.
 *
 * `lockedType` = la lista ya viene acotada a un tipo desde el servidor (**Negocio › Procesos**): se oculta el
 * desplegable de tipo, que ahí sólo tendría una opción, y se conserva el de sector.
 */
export function LibraryList({ items, lockedType = false }: { items: LibraryRow[]; lockedType?: boolean }) {
  const [sector, setSector] = useState('');
  const [type, setType] = useState('');

  const sectors = useMemo(() => [...new Set(items.map((i) => i.sector).filter(Boolean) as string[])].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.knowledgeType))].sort(), [items]);
  const rows = items.filter((i) => (!sector || i.sector === sector) && (!type || i.knowledgeType === type));

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
      : [{ header: t('field.kind'), value: (r: LibraryRow) => enumLabel(r.knowledgeType), cell: (r: LibraryRow) => enumLabel(r.knowledgeType) }]),
    { header: t('field.sector'), value: (r) => r.sector, cell: (r) => r.sector ?? <span className="text-fg-subtle">—</span> },
    // Fuente = SÓLO la procedencia. El enlace vive en su propia columna: el badge decía «Notion» y llevaba a
    // Drive, que es justo lo contrario de lo que promete.
    { header: t('field.sourceType'), value: (r) => r.sourceType, cell: (r) => <SourceBadge source={r.sourceType} /> },
    { header: t('field.link'), cell: (r) => <RowLink row={r} /> },
    // Control interactivo: sin `value`, así no es ordenable ni entra en el filtro (que es lo correcto).
    { header: t('field.status'), cell: (r) => <KnowledgeItemStatusControl id={r.id} current={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select className={selCls} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">{t('filter.allSectors')}</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!lockedType && (
          <select className={selCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t('filter.allTypes')}</option>
            {types.map((task) => <option key={task} value={task}>{enumLabel(task)}</option>)}
          </select>
        )}
        {(sector || type) && (
          <button type="button" onClick={() => { setSector(''); setType(''); }} className={btnLink}>{t('filter.clear')}</button>
        )}
        <span className="ml-auto self-center text-xs text-fg-subtle">{rows.length} de {items.length}</span>
      </div>

      <RecordTable
        columns={columns}
        rows={rows}
        getKey={(r) => r.id}
        empty={{ title: t('table.noMatches') }}
      />
    </div>
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
