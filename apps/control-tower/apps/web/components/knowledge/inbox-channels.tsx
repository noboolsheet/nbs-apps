'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson, patchJson, deleteJson } from '@/lib/client';
import { fieldCls } from '@/components/ui/input';
import { btnPrimary, buttonCls } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

/**
 * Gestión de canales de captura del Inbox (Fase 7). Cada canal es una conexión con nombre + token: se crea,
 * activa/desactiva, regenera el token o se elimina. El token se muestra UNA vez (al crear/regenerar).
 */
export interface InboxChannel {
  id: string;
  name: string;
  status: string;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
}

const inputCls = fieldCls;
const btn = buttonCls('secondary', 'sm');

export function InboxChannels({ channels, canManage }: { channels: InboxChannel[]; canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Token recién generado (se muestra una vez): { id, token }.
  const [freshToken, setFreshToken] = useState<{ id: string; token: string } | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = (id: string) => `${origin}/api/v1/inbox/webhook/${id}`;

  async function run<T>(fn: () => Promise<{ data?: T; error?: { message: string } }>): Promise<T | null> {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return null;
    }
    router.refresh();
    return res.data ?? null;
  }

  async function create() {
    if (!name.trim()) return;
    const data = await run<{ channel: InboxChannel; token: string }>(() => postJson('/api/v1/inbox-channels', { name }));
    if (data) {
      setName('');
      setFreshToken({ id: data.channel.id, token: data.token });
    }
  }

  async function regenerate(id: string) {
    const data = await run<{ channel: InboxChannel; token: string }>(() => postJson(`/api/v1/inbox-channels/${id}/regenerate`, {}));
    if (data) setFreshToken({ id, token: data.token });
  }

  if (!canManage) {
    return <p className="text-xs text-fg-subtle">{t('knowledge.channelsOwnerOnly')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <input className={inputCls} placeholder={t('knowledge.channelNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void create()}>
          + Añadir canal
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>

      {channels.length === 0 ? (
        <p className="text-sm text-fg-subtle">{t('knowledge.channelsEmpty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-subtle rounded border border-line">
          {channels.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{c.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-neutral-soft text-fg-muted'}`}>
                  {c.status === 'ACTIVE' ? t('knowledge.channelActive') : t('knowledge.channelDisabled')}
                </span>
                <span className="text-xs text-fg-subtle">
                  {c.lastUsedAt ? t('knowledge.channelLastUsed', { fecha: formatDateTime(c.lastUsedAt) }) : t('knowledge.channelNeverUsed')}
                </span>
                <span className="ml-auto flex gap-1">
                  <button type="button" className={btn} disabled={busy} onClick={() => void run(() => patchJson(`/api/v1/inbox-channels/${c.id}`, { status: c.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }))}>
                    {c.status === 'ACTIVE' ? t('knowledge.channelDisable') : t('knowledge.channelEnable')}
                  </button>
                  <button type="button" className={btn} disabled={busy} onClick={() => void regenerate(c.id)}>{t('knowledge.regenerateToken')}</button>
                  <button type="button" className={`${btn} text-danger`} disabled={busy} onClick={() => { if (confirm(t('knowledge.confirmDeleteChannel', { name: c.name }))) void run(() => deleteJson(`/api/v1/inbox-channels/${c.id}`)); }}>{t('common.remove')}</button>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-fg-muted">
                <span className="shrink-0">{t('knowledge.webhookLabel')}</span>
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded bg-neutral-soft px-2 py-1">POST {webhookUrl(c.id)}</code>
              </div>
              {freshToken?.id === c.id && (
                <div className="rounded border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-fg">
                  <p className="mb-1 font-medium text-warning">{t('knowledge.tokenOnce')}</p>
                  <code className="block overflow-x-auto whitespace-nowrap">{freshToken.token}</code>
                  <p className="mt-1 text-warning">{t('knowledge.tokenHeader')} <code>Authorization: Bearer &lt;token&gt;</code>.</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
