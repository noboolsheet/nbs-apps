'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';
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

/** Lista de Learning Path con filtros por sector, tipo y estado (todo cliente, sobre las filas ya cargadas). */
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
          <button type="button" onClick={() => { setSector(''); setKind(''); setStatus(''); }} className="text-sm text-fg-muted underline">
            {t('filter.clear')}
          </button>
        )}
        <span className="ml-auto self-center text-xs text-fg-subtle">{rows.length} de {items.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-fg-muted">
              <th className="border-b border-line px-2 py-1.5">{t('field.title')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.kind')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.sector')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('field.status')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('projects.colProgress')}</th>
              <th className="border-b border-line px-2 py-1.5">{t('entity.resource')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line-subtle px-2 py-1.5">
                  <RecordLink entity="learning" id={r.id} className="font-medium underline-offset-2 hover:underline">{r.title}</RecordLink>
                </td>
                <td className="border-b border-line-subtle px-2 py-1.5">{r.kind}</td>
                <td className="border-b border-line-subtle px-2 py-1.5">{r.sector ?? <span className="text-fg-subtle">—</span>}</td>
                <td className="border-b border-line-subtle px-2 py-1.5"><StatusBadge status={r.status} /></td>
                <td className="border-b border-line-subtle px-2 py-1.5">{r.progress != null ? `${r.progress}%` : <span className="text-fg-subtle">—</span>}</td>
                <td className="border-b border-line-subtle px-2 py-1.5">
                  {r.url ? <a className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400" href={r.url} target="_blank" rel="noreferrer">{t('common.open')}</a> : <span className="text-fg-subtle">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
