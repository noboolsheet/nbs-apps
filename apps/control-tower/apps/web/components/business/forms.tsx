'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_STATUS, CAPABILITY_STATUS } from '@ct/domain';
import { postJson } from '@/lib/client';
import { StatusSelect } from '@/components/ui/status-select';
import { fieldCls } from '@/components/ui/input';
import { btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

const inputCls = fieldCls;

function useSubmit() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ error?: { message: string } }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setError(res.error.message);
    else router.refresh();
    return !res.error;
  }
  return { error, busy, run };
}

/** Control para cambiar el estado (valida transición en el servidor). */
export function StatusControl({
  kind,
  id,
  current,
}: {
  kind: 'services' | 'capabilities';
  id: string;
  current: string;
}) {
  const options = kind === 'services' ? SERVICE_STATUS : CAPABILITY_STATUS;
  return <StatusSelect endpoint={`/api/v1/${kind}/${id}/status`} field="status" current={current} options={options} />;
}

/** Vincula una capability (de una lista) al service actual. */
export function LinkCapabilityControl({
  serviceId,
  options,
}: {
  serviceId: string;
  options: { id: string; name: string }[];
}) {
  const [capabilityId, setCapabilityId] = useState('');
  const { error, busy, run } = useSubmit();
  if (options.length === 0) return <p className="text-sm text-fg-muted">{t('business.capabilityLinkAllUsed')}</p>;
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!capabilityId) return;
        const ok = await run(() => postJson(`/api/v1/services/${serviceId}/capabilities`, { capabilityId }));
        if (ok) setCapabilityId('');
      }}
    >
      <select className={inputCls} value={capabilityId} onChange={(e) => setCapabilityId(e.target.value)}>
        <option value="">{t('business.capabilityLinkPlaceholder')}</option>
        {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <button className={btnSecondary} disabled={busy || !capabilityId}>{t('business.capabilityLinkAction')}</button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
