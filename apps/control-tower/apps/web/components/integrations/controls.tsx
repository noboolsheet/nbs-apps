'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson, deleteJson, patchJson } from '@/lib/client';
import { t } from '@/lib/i18n';

const btn = 'rounded border border-line-strong px-3 py-1.5 text-sm disabled:opacity-50';

function useAction() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ error?: { message: string } }>, okMsg?: string) {
    setBusy(true);
    setMsg(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else {
      if (okMsg) setMsg(okMsg);
      router.refresh();
    }
  }
  return { msg, busy, run };
}

export function ConnectProviderButton({ provider, displayName }: { provider: string; displayName: string }) {
  const { msg, busy, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={busy} onClick={() => run(() => postJson('/api/v1/integrations', { provider, displayName }))}>
        Conectar {displayName}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}

export function SyncNowButton({ id }: { id: string }) {
  const { msg, busy, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={busy} onClick={() => run(() => postJson(`/api/v1/integrations/${id}/sync`, {}), 'Sincronización encolada')}>
        {t('ui.sincronizarAhora')}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}

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
        : 'JSON de configuración (no secretos).';

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      setMsg('JSON inválido');
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
      <summary className="cursor-pointer text-xs text-fg-muted">{t('ui.configuracion')}</summary>
      <div className="mt-2 flex flex-col gap-2">
        <textarea
          className="w-full rounded border border-line-strong bg-transparent px-2 py-1.5 font-mono text-xs"
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
  const { msg, busy, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className={`${btn} text-danger hover:bg-danger-soft`}
        disabled={busy}
        onClick={() => {
          if (!confirm(`¿Desconectar ${displayName}? Dejará de sincronizarse y volverá a "Disponibles".`)) return;
          void run(() => deleteJson(`/api/v1/integrations/${id}`), 'Desconectada');
        }}
      >
        {t('ui.desconectar')}
      </button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}
