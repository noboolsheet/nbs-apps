'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PORTFOLIO_ITEM_STATUS, PORTFOLIO_ITEM_VISIBILITY } from '@ct/domain';
import { patchJson } from '@/lib/client';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';

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

export function PortfolioStatusControl({ id, current }: { id: string; current: string }) {
  const { error, busy, run } = useSubmit();
  return (
    <span className="inline-flex items-center gap-1">
      <select className={inputCls} value={current} disabled={busy} onChange={(e) => run(() => patchJson(`/api/v1/portfolio-items/${id}/status`, { status: e.target.value }))}>
        {PORTFOLIO_ITEM_STATUS.map((s) => <option key={s} value={s}>{enumLabel(s)}</option>)}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function PortfolioVisibilityControl({ id, current }: { id: string; current: string }) {
  const { error, busy, run } = useSubmit();
  return (
    <span className="inline-flex items-center gap-1">
      <select className={inputCls} value={current} disabled={busy} onChange={(e) => run(() => patchJson(`/api/v1/portfolio-items/${id}/visibility`, { visibility: e.target.value }))}>
        {PORTFOLIO_ITEM_VISIBILITY.map((v) => <option key={v} value={v}>{enumLabel(v)}</option>)}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
