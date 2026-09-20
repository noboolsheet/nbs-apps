'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RecordLink } from '@/components/ui/record-link';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export type FailedPush = {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

/**
 * Envíos a sistemas externos que fallaron (write-back a Twenty, push a Notion). Antes sólo se veía el contador
 * "FAILED: N" sin el motivo, así que un cambio que no llegaba al origen era invisible: el sync siguiente reponía
 * el valor viejo y parecía que Control Tower "no había guardado". Aquí se ve el motivo y se puede reintentar
 * cuando la causa esté arreglada en el sistema externo.
 */
export function FailedPushes({ rows }: { rows: FailedPush[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Reintentar = volver a enviar con el estado ACTUAL de Control Tower (no con el que falló en su día). */
  async function retry(id: string) {
    setBusy(id);
    setError(null);
    const res = await postJson(`/api/v1/outbox/failed/${id}/retry`, {});
    setBusy(null);
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  /** Descartar = darlo por cerrado sin enviarlo (p. ej. ya lo corregiste a mano en el sistema externo). */
  async function discard(id: string) {
    if (!confirm(t('automation.discardConfirm'))) return;
    setBusy(id);
    setError(null);
    const res = await postJson(`/api/v1/outbox/failed/${id}/discard`, {});
    setBusy(null);
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  if (rows.length === 0) return <EmptyState title={t('automation.noFailedPushes')} />;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-1 rounded-lg border border-danger-border px-3 py-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{r.eventType}</span>
              <RecordLink entity={r.aggregateType} id={r.aggregateId} className="text-link underline-offset-2 hover:underline">
                {enumLabel(r.aggregateType)}
              </RecordLink>
              <span className="text-xs text-fg-subtle">
                {formatDateTime(r.createdAt)} · {t('automation.attempts', { n: r.attempts })}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={busy === r.id} onClick={() => void retry(r.id)}>
                {busy === r.id ? t('automation.retrying') : t('automation.retry')}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => void discard(r.id)}>
                {t('automation.discard')}
              </Button>
            </span>
          </div>
          {r.lastError && <p className="text-xs text-danger">{r.lastError}</p>}
        </div>
      ))}
    </div>
  );
}
