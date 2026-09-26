'use client';

import { PORTFOLIO_ITEM_STATUS, PORTFOLIO_ITEM_VISIBILITY } from '@ct/domain';
import { patchJson } from '@/lib/client';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from '@/components/ui/input';
import { useFormAction } from '@/lib/use-form-action';

const inputCls = fieldCls;

export function PortfolioStatusControl({ id, current }: { id: string; current: string }) {
  const { error, busy, run } = useFormAction();
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
  const { error, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-1">
      <select className={inputCls} value={current} disabled={busy} onChange={(e) => run(() => patchJson(`/api/v1/portfolio-items/${id}/visibility`, { visibility: e.target.value }))}>
        {PORTFOLIO_ITEM_VISIBILITY.map((v) => <option key={v} value={v}>{enumLabel(v)}</option>)}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
