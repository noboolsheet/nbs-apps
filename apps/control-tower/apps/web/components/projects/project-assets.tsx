'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson, deleteJson } from '@/lib/client';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';

export type LinkedAsset = {
  id: string;
  name: string;
  assetType: string;
  status: string;
  externalUrl: string | null;
  repositoryUrl: string | null;
};

/**
 * A-3 (ADR-007) — activos REUTILIZABLES enlazados a un proyecto (N:M vía `project_assets`).
 * Enlazar es una referencia al catálogo de la organización: desenlazar NO borra el activo.
 * (No confundir con la pestaña «Activos» = `resources`, que son los accesos/apps del proyecto.)
 */
export function ProjectAssets({
  projectId,
  linked,
  catalog,
  frozen,
}: {
  projectId: string;
  linked: LinkedAsset[];
  catalog: { id: string; name: string }[];
  frozen?: boolean;
}) {
  const router = useRouter();
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linked.map((a) => a.id));
  const options = catalog.filter((a) => !linkedIds.has(a.id)).map((a) => ({ value: a.id, label: a.name }));

  async function link(assetId: string) {
    if (!assetId) return;
    setBusy(true);
    setError(null);
    const res = await postJson(`/api/v1/projects/${projectId}/assets`, { assetId });
    setBusy(false);
    setPick('');
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  async function unlink(assetId: string) {
    setBusy(true);
    setError(null);
    const res = await deleteJson(`/api/v1/projects/${projectId}/assets/${assetId}`);
    setBusy(false);
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {!frozen && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-fg-muted">{t('ui.enlazarActivoDelCatalogo')}</span>
          <SearchableSelect
            value={pick}
            onChange={(v) => {
              setPick(v);
              void link(v);
            }}
            options={options}
            placeholder={t('ui.elegirActivo')}
          />
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {linked.length === 0 ? (
        <EmptyState
          title={t('ui.sinActivosReutilizables')}
          hint={t('ui.enlazaUnaPlantillaUnRepoOUnComponenteDel')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {linked.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <RecordLink entity="asset" id={a.id} className="font-medium underline-offset-2 hover:underline">
                  {a.name}
                </RecordLink>
                <span className="text-xs text-fg-muted">{a.assetType}</span>
                <StatusBadge status={a.status} />
                {(a.externalUrl ?? a.repositoryUrl) && (
                  <a
                    href={(a.externalUrl ?? a.repositoryUrl)!}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-link underline-offset-2 hover:underline"
                  >
                    {t('ui.abrir')}
                  </a>
                )}
              </span>
              {!frozen && (
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void unlink(a.id)}>
                  {t('ui.desenlazar')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
