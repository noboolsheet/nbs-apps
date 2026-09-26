'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { patchJson, postJson } from '@/lib/client';
import { Drawer } from '@/components/ui/drawer';
import { DescriptionList, type DLItem } from '@/components/ui/description-list';
import { StatusBadge } from '@/components/ui/status-badge';
import { buttonCls } from '@/components/ui/button';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

/**
 * Panel lateral (solo lectura, sin ficha) de una automatización. Montado una vez en el AppShell y controlado por
 * `?auto=<key>`. Muestra todos los detalles del catálogo + estado + última ejecución y, al pie, los botones de acción:
 * Activar/Desactivar (si es `toggleable`) y «Ejecutar ahora» (si es `runnable`). El núcleo del motor sale como solo lectura.
 */

interface AutomationDetail {
  key: string;
  title: string;
  kind: 'core' | 'event' | 'sync' | 'sweep';
  description: string;
  frequencyLabel: string;
  triggerLabel: string;
  scope: 'org' | 'global';
  toggleable: boolean;
  runnable: boolean;
  provider?: string;
  requirements: string[];
  pauseEffect: string;
  notes?: string;
  status: string; // 'CORE' | 'ACTIVE' | 'PAUSED'
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

const KIND_LABEL: Record<AutomationDetail['kind'], string> = {
  core: t('automation.classCore'),
  event: t('automation.classEvent'),
  sync: t('automation.classSync'),
  sweep: t('automation.classSweep'),
};

function fmtDate(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : formatDateTime(d);
}

export function AutomationPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spStr = sp.toString();
  const key = sp.get('auto');

  const [detail, setDetail] = useState<AutomationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const close = useCallback(() => {
    const p = new URLSearchParams(spStr);
    p.delete('auto');
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }); // cerrar tampoco debe mover la página
  }, [router, pathname, spStr]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setLoading(true);
    setMsg(null);
    fetch(`/api/v1/automations/${key}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDetail((json.data as AutomationDetail | undefined) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, reload]);

  if (!key) return null;

  async function toggle() {
    if (!detail) return;
    const next = detail.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setBusy(true);
    setMsg(null);
    const res = await patchJson(`/api/v1/automations/${detail.key}`, { status: next });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else {
      setReload((n) => n + 1);
      router.refresh();
    }
  }

  async function runNow() {
    if (!detail) return;
    setBusy(true);
    setMsg(null);
    const res = await postJson<Record<string, unknown>>(`/api/v1/automations/${detail.key}/run`, {});
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message);
      return;
    }
    const d = res.data ?? {};
    if (d.kind === 'sync') setMsg(`${t('automation.syncQueued')} ✓`);
    else if (d.skipped) setMsg(t('automation.runNothingToDo', { reason: String(d.reason ?? '') }));
    else if (typeof d.deleted === 'number') setMsg(t('automation.runDeleted', { n: d.deleted }));
    else if (typeof d.archived === 'number') setMsg(t('automation.runArchived', { n: d.archived }));
    else setMsg(t('automation.runDone'));
    setReload((n) => n + 1);
    router.refresh();
  }

  const title = detail ? detail.title : t('automation.panelFallbackTitle');
  const items: DLItem[] = detail
    ? [
        { label: t('field.status'), value: <StatusBadge status={detail.status} /> },
        { label: t('field.kind'), value: KIND_LABEL[detail.kind] },
        { label: t('automation.panelWhat'), value: detail.description },
        { label: t('automation.panelFrequency'), value: detail.frequencyLabel },
        { label: t('automation.panelTrigger'), value: detail.triggerLabel },
        { label: t('automation.panelScope'), value: detail.scope === 'org' ? t('automation.scopeOrg') : t('automation.scopeGlobal') },
        {
          label: t('automation.panelRequirements'),
          value: (
            <ul className="list-disc pl-4">
              {detail.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ),
        },
        { label: t('automation.panelPauseEffect'), value: detail.pauseEffect },
        ...(detail.kind === 'sync'
          ? [
              {
                label: t('automation.panelLastRun'),
                value: detail.lastRunAt
                  ? `${fmtDate(detail.lastRunAt)}${detail.lastRunStatus ? ` · ${enumLabel(detail.lastRunStatus)}` : ''}`
                  : 'Nunca',
              } as DLItem,
            ]
          : []),
        ...(detail.notes ? [{ label: t('field.notes'), value: detail.notes } as DLItem] : []),
        ...(detail.kind === 'sync'
          ? [
              {
                label: t('automation.panelIntegration'),
                value: (
                  <Link href="/automation/integrations" className="text-blue-600 underline dark:text-blue-400">
                    {t('automation.panelIntegrationsLink')}
                  </Link>
                ),
              } as DLItem,
            ]
          : []),
      ]
    : [];

  return (
    <Drawer title={title} onClose={close}>
      {loading || !detail ? (
        <p className="text-sm text-fg-muted">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <DescriptionList items={items} />

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {detail.toggleable ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle()}
                  className={buttonCls(detail.status === 'PAUSED' ? 'primary' : 'secondary')}
                >
                  {detail.status === 'PAUSED' ? 'Activar' : 'Desactivar'}
                </button>
                {detail.runnable && (
                  <button type="button" disabled={busy} onClick={() => void runNow()} className={buttonCls('secondary')}>
                    {t('automation.runNow')}
                  </button>
                )}
              </div>
            ) : (
              <p className="rounded border border-line bg-surface-muted px-3 py-2 text-xs text-fg-muted">{t('automation.panelCoreNotice')}</p>
            )}
            {msg && <span className="text-xs text-fg-muted">{msg}</span>}
          </div>
        </div>
      )}
    </Drawer>
  );
}
