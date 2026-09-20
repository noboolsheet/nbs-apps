'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export type SyncRunView = {
  status: string;
  created: number;
  updated: number;
  deleted: number;
  skippedCount: number;
  skips: { entity: string; externalId: string; error: string }[] | null;
  error: string | null;
  startedAt: string;
};

/**
 * F-16 — resumen de la última sync de una integración: contadores + los registros SALTADOS con su motivo.
 * Antes esa información sólo existía en los logs del worker. `COMPLETED_WITH_WARNINGS` = el sync terminó,
 * pero hubo registros que no se pudieron traer (resiliencia por-registro, F-13).
 */
export function SyncRunSummary({ run }: { run: SyncRunView }) {
  const [open, setOpen] = useState(false);
  const warn = run.status === 'COMPLETED_WITH_WARNINGS';
  const failed = run.status === 'FAILED';

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-fg-subtle">Última sync {formatDateTime(run.startedAt)}:</span>
        {failed ? (
          <span className="text-danger">{t('ui.fallo')}</span>
        ) : (
          <span className="text-fg-muted">
            {run.created} creados · {run.updated} actualizados
            {run.deleted > 0 && ` · ${run.deleted} borrados`}
          </span>
        )}
        {warn && (
          <span className="rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning-soft-fg">
            {run.skippedCount} saltados
          </span>
        )}
        {(warn || failed) && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-link underline-offset-2 hover:underline"
          >
            {open ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-1 rounded border border-line-subtle px-2 py-1.5">
          {failed && run.error && <span className="text-danger">{run.error}</span>}
          {run.skips?.map((s, i) => (
            <span key={`${s.externalId}-${i}`} className="text-fg-muted">
              <span className="text-fg">{s.entity}</span> <code className="text-fg-subtle">{s.externalId}</code>: {s.error}
            </span>
          ))}
          {warn && (run.skips?.length ?? 0) < run.skippedCount && (
            <span className="text-fg-subtle">
              …y {run.skippedCount - (run.skips?.length ?? 0)} más (sólo se guarda el detalle de los primeros).
            </span>
          )}
        </div>
      )}
    </div>
  );
}
