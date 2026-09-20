'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';
import { btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * Botón «Purgar ahora» que ejecuta AHORA el barrido de una política de retención (el worker lo hace solo; esto
 * es el atajo manual). Los tres botones de Ajustes salen de aquí y comparten **exactamente** la misma etiqueta,
 * tamaño y ancho mínimo: antes cada uno llevaba su propio texto («Purgar completadas ahora» / «Purgar archivados
 * ahora») y quedaban desalineados en la columna. Lo que distingue a cada uno es la política a la que acompaña;
 * el `aria-label` lo dice para quien no ve esa relación visual.
 */
function PurgeButton<T>({
  endpoint,
  policyLabel,
  result,
}: {
  endpoint: string;
  policyLabel: string;
  /** Mensaje a mostrar con lo que devolvió el barrido (`retentionDays: 0` ⇒ no hay política configurada). */
  result: (data: T & { retentionDays: number }) => string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<ReactNode>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await postJson<T & { retentionDays: number }>(endpoint, {});
    setBusy(false);
    if (res.error) {
      setMsg(<span className="text-danger">{res.error.message}</span>);
      return;
    }
    setMsg(result(res.data!));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        aria-label={`${t('settings.purgeNow')} — ${policyLabel}`}
        className={`w-36 shrink-0 ${btnSecondary}`}
      >
        {busy ? t('settings.purging') : t('settings.purgeNow')}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </div>
  );
}

/** Purga de tareas completadas (Fase 4). */
export function PurgeCompletedButton({ policyLabel }: { policyLabel: string }) {
  return (
    <PurgeButton<{ deleted: number; skippedParents: number; blocked: number }>
      endpoint="/api/v1/maintenance/purge-completed-tasks"
      policyLabel={policyLabel}
      result={(d) =>
        d.retentionDays <= 0
          ? t('settings.purgeNoPolicy')
          : t('settings.purgeDone', { n: String(d.deleted) }) +
            (d.skippedParents ? ` ${t('settings.purgeKeptParents', { n: String(d.skippedParents) })}` : '') +
            (d.blocked ? ` ${t('settings.purgeKeptReferenced', { n: String(d.blocked) })}` : '')
      }
    />
  );
}

/** Purga de ARCHIVADOS (borrado definitivo; deja rastro en `audit_logs`). */
export function PurgeArchivedButton({ policyLabel }: { policyLabel: string }) {
  return (
    <PurgeButton<{ deleted: number; skipped: number }>
      endpoint="/api/v1/maintenance/purge-archived"
      policyLabel={policyLabel}
      result={(d) =>
        d.retentionDays <= 0
          ? t('settings.purgeNoPolicy')
          : t('settings.purgeDone', { n: String(d.deleted) }) +
            (d.skipped ? ` ${t('settings.purgeKeptReferenced', { n: String(d.skipped) })}` : '')
      }
    />
  );
}

/** Purga de la cola «Por revisar» (lo ya revisado o descartado). */
export function PurgeReviewedButton({ policyLabel }: { policyLabel: string }) {
  return (
    <PurgeButton<{ deleted: number }>
      endpoint="/api/v1/maintenance/purge-reviewed"
      policyLabel={policyLabel}
      result={(d) =>
        d.retentionDays <= 0 ? t('settings.purgeNoPolicy') : t('settings.purgeDone', { n: String(d.deleted) })
      }
    />
  );
}
