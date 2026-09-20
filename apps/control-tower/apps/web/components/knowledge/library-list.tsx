'use client';

import { useMemo, useState } from 'react';
import { SourceBadge } from '@/components/ui/source-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { RecordLink } from '@/components/ui/record-link';
import { singleExternalUrl } from '@/lib/external-url';
import { KnowledgeItemStatusControl } from '@/components/knowledge/forms';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';
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
 * `lockedType` = la lista ya viene acotada a un tipo desde el servidor (**Negocio › Procesos**): se oculta el
 * desplegable de tipo, que ahí sólo tendría una opción, y se conserva el de sector.
 */
export function LibraryList({ items, lockedType = false }: { items: LibraryRow[]; lockedType?: boolean }) {
  const [sector, setSector] = useState('');
  const [type, setType] = useState('');

  const sectors = useMemo(() => [...new Set(items.map((i) => i.sector).filter(Boolean) as string[])].sort(), [items]);
  const types = useMemo(() => [...new Set(items.map((i) => i.knowledgeType))].sort(), [items]);
  const rows = items.filter((i) => (!sector || i.sector === sector) && (!type || i.knowledgeType === type));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select className={selCls} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">{t('ui.todosLosSectores')}</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {!lockedType && (
          <select className={selCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t('ui.todosLosTipos')}</option>
            {types.map((task) => <option key={task} value={task}>{enumLabel(task)}</option>)}
          </select>
        )}
        {(sector || type) && (
          <button type="button" onClick={() => { setSector(''); setType(''); }} className="text-sm text-fg-muted underline">{t('ui.limpiar')}</button>
        )}
        <span className="ml-auto self-center text-xs text-fg-subtle">{rows.length} de {items.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-fg-muted">
              <th className="border-b border-line px-2 py-1.5">{t('entity.knowledge_item')}</th>
              {!lockedType && <th className="border-b border-line px-2 py-1.5">{t('field.kind')}</th>}
              <th className="border-b border-line px-2 py-1.5">{t('field.sector')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.sourceType')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.link')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line-subtle px-2 py-1.5">
                  <RecordLink entity="knowledge_item" id={r.id} className="font-medium underline-offset-2 hover:underline">{r.title}</RecordLink>
                </td>
                {!lockedType && <td className="border-b border-line-subtle px-2 py-1.5">{enumLabel(r.knowledgeType)}</td>}
                <td className="border-b border-line-subtle px-2 py-1.5">{r.sector ?? <span className="text-fg-subtle">—</span>}</td>
                {/* Fuente = SÓLO la procedencia. El enlace vive en su propia columna: el badge decía «Notion» y
                    llevaba a Drive, que es justo lo contrario de lo que promete. */}
                <td className="border-b border-line-subtle px-2 py-1.5"><SourceBadge source={r.sourceType} /></td>
                <td className="border-b border-line-subtle px-2 py-1.5"><RowLink row={r} /></td>
                <td className="border-b border-line-subtle px-2 py-1.5"><KnowledgeItemStatusControl id={r.id} current={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  if (url) return <ExternalSourceLink url={url} label={t('knowledge.abrirFuente')} />;
  if (row.notionUrl) return <ExternalSourceLink url={row.notionUrl} label={t('knowledge.abrirEnNotion')} />;
  return <span className="text-fg-subtle">—</span>;
}
