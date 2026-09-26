'use client';

import { useState } from 'react';
import { getJson } from '@/lib/client';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

type ChangeRow = {
  id: string;
  changeType: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  actorType: string;
  createdAt: string;
};

/**
 * F-4 — bloque "Historial" del panel lateral: los últimos cambios de ESTE registro (cambios de estado y
 * diffs campo a campo). Se carga **bajo demanda** al desplegarlo, para no encarecer el GET del panel.
 * `labels` traduce el nombre técnico del campo a su etiqueta del formulario.
 */
export function RecordHistory({ entity, id, labels }: { entity: string; id: string; labels: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ChangeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      const res = await getJson<ChangeRow[]>(`/api/v1/history?entity=${encodeURIComponent(entity)}&id=${id}`);
      if (res.error) setError(res.error.message);
      else setRows(res.data ?? []);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle hover:text-fg-muted"
      >
        <span aria-hidden>{open ? '▾' : '▸'}</span> {t('history.title')}
      </button>
      {open && (
        <div className="flex flex-col gap-2 text-xs">
          {error && <p className="text-danger">{error}</p>}
          {rows === null && !error && <p className="text-fg-muted">{t('common.loading')}</p>}
          {rows?.length === 0 && <p className="text-fg-muted">{t('history.empty')}</p>}
          {rows?.map((r) => (
            <div key={r.id} className="flex flex-col gap-0.5 rounded border border-line-subtle px-2 py-1.5">
              <span className="text-fg-subtle">
                {formatDateTime(r.createdAt)} · {r.actorType === 'SYSTEM' ? t('enum.SYSTEM') : t('history.you')}
              </span>
              {Object.keys(r.newState ?? {}).map((key) => (
                <span key={key} className="text-fg-muted">
                  <span className="text-fg">{labels[key] ?? key}</span>: {fmt(r.previousState?.[key])} →{' '}
                  {fmt(r.newState?.[key])}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Valor legible para el historial: vacío, booleano, enum traducido o texto recortado. */
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  const s = String(v);
  const label = enumLabel(s);
  return label.length > 60 ? `${label.slice(0, 60)}…` : label;
}
