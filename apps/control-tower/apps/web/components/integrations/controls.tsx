'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getJson, postJson, deleteJson, patchJson } from '@/lib/client';
import { btnSecondary } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { fieldCls } from '@/components/ui/input';
import { useFormAction } from '@/lib/use-form-action';
import { t } from '@/lib/i18n';

const btn = btnSecondary;


export function ConnectProviderButton({ provider, displayName }: { provider: string; displayName: string }) {
  const { msg, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={busy} onClick={() => run(() => postJson('/api/v1/integrations', { provider, displayName }))}>
        Conectar {displayName}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}

/**
 * «Sincronizar ahora»: el POST sólo **encola** el job; lo ejecuta el worker en su tick (hasta 2 s de espera, más lo
 * que tarde el proveedor). Antes se mostraba «Sincronización encolada» y ahí se quedaba la pantalla: el resultado
 * —activa, o error— sólo aparecía si recargabas a mano un rato después.
 *
 * Ahora se **sigue el job** hasta que termina (`GET /api/v1/jobs/{id}`), con un indicador girando mientras dura, y
 * al acabar se refresca la vista sola para que la fila muestre el estado y la última sync de verdad.
 */
function SyncNowButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState<string | null>(null);
  // El polling vive en un ref para poder cortarlo si el componente se desmonta a mitad (navegar durante el sync).
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  async function start() {
    setState('running');
    setMsg(t('automation.syncRunning'));
    const res = await postJson<{ jobId: string }>(`/api/v1/integrations/${id}/sync`, {});
    if (res.error || !res.data?.jobId) {
      setState('error');
      setMsg(res.error?.message ?? t('automation.syncFailed'));
      return;
    }
    await track(res.data.jobId);
  }

  async function track(jobId: string) {
    // Tope de espera: un sync normal tarda segundos, pero si el worker está caído nadie tocará ese job nunca y la
    // pantalla no puede quedarse girando para siempre. Al agotarse se dice qué mirar, no se finge un resultado.
    const deadline = Date.now() + 120_000;
    while (alive.current && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      if (!alive.current) return;
      const job = await getJson<{ status: string; lastError: string | null }>(`/api/v1/jobs/${jobId}`);
      if (job.error) continue; // un fallo de red suelto no cancela el seguimiento
      const status = job.data?.status;
      if (status === 'COMPLETED') {
        setState('done');
        setMsg(t('automation.syncDone'));
        router.refresh(); // la fila ya puede mostrar «última sync» y su estado real
        return;
      }
      if (status === 'FAILED' || status === 'CANCELLED') {
        setState('error');
        setMsg(job.data?.lastError ?? t('automation.syncFailed'));
        router.refresh(); // el estado de la integración pasa a ERROR: que se vea
        return;
      }
    }
    if (!alive.current) return;
    setState('error');
    setMsg(t('automation.syncTimeout'));
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={state === 'running'} onClick={() => void start()}>
        {t('automation.syncNow')}
      </button>
      {state === 'running' && <Spinner className="text-fg-muted" />}
      {msg && (
        <span className={`text-xs ${state === 'error' ? 'text-danger' : 'text-fg-muted'}`} role="status">
          {msg}
        </span>
      )}
    </span>
  );
}

export { SyncNowButton };

/**
 * Editor de la `configuration` (jsonb no sensible) de una integración: p. ej. folderId (Drive) o el mapa
 * databases (Notion). Resuelve no tener que tocar la DB a mano en el Pi. Los SECRETOS van en env, nunca aquí.
 */
export function IntegrationConfigForm({ id, provider, configuration }: { id: string; provider: string; configuration: unknown }) {
  const router = useRouter();
  const [value, setValue] = useState(() => JSON.stringify(configuration ?? {}, null, 2));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hint =
    provider === 'GDRIVE'
      ? 'Ej: { "folderId": "1AbC…" } — ID de la carpeta compartida con la service account.'
      : provider === 'NOTION'
        ? 'Ej: { "databases": { "decisions": "<id>", "projects": "<id>", … } } — ver NOTION_INFORMATION_ARCHITECTURE.md.'
        : t('automation.configJsonLabel');

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      setMsg(t('automation.configJsonInvalid'));
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await patchJson(`/api/v1/integrations/${id}`, { configuration: parsed });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else {
      setMsg('Guardado ✓');
      router.refresh();
    }
  }

  return (
    <details className="w-full">
      <summary className="cursor-pointer text-xs text-fg-muted">{t('automation.configuration')}</summary>
      <div className="mt-2 flex flex-col gap-2">
        <textarea
          className={`${fieldCls} w-full font-mono !text-xs`}
          rows={6}
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} disabled={busy} onClick={save}>
            {t('common.save')}
          </button>
          {msg && <span className="text-xs text-fg-muted">{msg}</span>}
        </div>
        <span className="text-xs text-fg-subtle">{hint}</span>
      </div>
    </details>
  );
}

export function DisconnectButton({ id, displayName }: { id: string; displayName: string }) {
  const { msg, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className={`${btn} text-danger hover:bg-danger-soft`}
        disabled={busy}
        onClick={() => {
          if (!confirm(t('automation.confirmDisconnect', { name: displayName }))) return;
          void run(() => deleteJson(`/api/v1/integrations/${id}`), t('automation.disconnected'));
        }}
      >
        {t('automation.disconnect')}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}
