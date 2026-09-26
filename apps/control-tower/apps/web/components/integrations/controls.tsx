'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson, deleteJson, patchJson } from '@/lib/client';
import { btnSecondary } from '@/components/ui/button';
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

export function SyncNowButton({ id }: { id: string }) {
  const { msg, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button className={btn} disabled={busy} onClick={() => run(() => postJson(`/api/v1/integrations/${id}/sync`, {}), t('automation.syncQueued'))}>
        {t('automation.syncNow')}
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
