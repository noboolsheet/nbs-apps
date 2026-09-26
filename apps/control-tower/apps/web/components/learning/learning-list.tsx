'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { type Column } from '@/components/ui/entity-table';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';
import { btnLink } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export interface LearningRow {
  id: string;
  title: string;
  kind: string;
  status: string;
  sector: string | null;
  url: string | null;
  progress: number | null;
}

const selCls = fieldCls;

/**
 * Lista de Learning Path con filtros por sector, tipo y estado (cliente, sobre las filas ya cargadas).
 *
 * La tabla es **`RecordTable`**, como las demás vistas: antes pintaba su propio `<table>` y por eso se había
 * quedado sin la ordenación por columna ni el filtro rápido de F-28. Los desplegables se conservan: acotan por un
 * valor exacto, que es otra cosa que buscar texto.
 */
export function LearningList({ items }: { items: LearningRow[] }) {
  const [sector, setSector] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');

  const sectors = useMemo(() => [...new Set(items.map((i) => i.sector).filter(Boolean) as string[])].sort(), [items]);
  const kinds = useMemo(() => [...new Set(items.map((i) => i.kind))].sort(), [items]);
  const statuses = useMemo(() => [...new Set(items.map((i) => i.status))].sort(), [items]);

  const rows = items.filter(
    (i) => (!sector || i.sector === sector) && (!kind || i.kind === kind) && (!status || i.status === status),
  );

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
    { header: t('field.kind'), value: (r) => r.kind, cell: (r) => r.kind },
    { header: t('field.sector'), value: (r) => r.sector, cell: (r) => r.sector ?? <span className="text-fg-subtle">—</span> },
    { header: t('field.status'), value: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: t('projects.colProgress'),
      value: (r) => r.progress,
      cell: (r) => (r.progress != null ? `${r.progress}%` : <span className="text-fg-subtle">—</span>),
    },
    {
      header: t('entity.resource'),
      // El enlace usa `ExternalSourceLink`: aquí estaba escrito a mano con `text-blue-600 dark:text-blue-400`,
      // que se salta los tokens del tema (DESIGN_TOKENS: nada de `dark:` a mano).
      cell: (r) => (r.url ? <ExternalSourceLink url={r.url} label={t('common.open')} /> : <span className="text-fg-subtle">—</span>),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select className={selCls} value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">{t('filter.allSectors')}</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">{t('filter.allTypes')}</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select className={selCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('filter.allStatuses')}</option>
          {statuses.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}
        </select>
        {(sector || kind || status) && (
          <button type="button" onClick={() => { setSector(''); setKind(''); setStatus(''); }} className={btnLink}>
            {t('filter.clear')}
          </button>
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
