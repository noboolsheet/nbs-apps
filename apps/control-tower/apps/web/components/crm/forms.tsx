'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OPPORTUNITY_STAGE, CLIENT_STATUS } from '@ct/domain';
import { StatusSelect } from '@/components/ui/status-select';
import { btnSecondary } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { postJson } from '@/lib/client';
import { t } from '@/lib/i18n';

/**
 * Cambia el estado del cliente (ACTIVE/INACTIVE). Es un estado SÓLO de CT: no se empuja a Twenty ni el pull
 * lo pisa (el mapper de Twenty no incluye status). Reutiliza el update de cliente existente.
 */
export function ClientStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/clients/${id}`} field="status" current={current} options={CLIENT_STATUS} />;
}

/** Cambia el stage de una oportunidad (Kanban). Valida transición en el servidor. */
export function OpportunityStageControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/opportunities/${id}/stage`} field="stage" current={current} options={OPPORTUNITY_STAGE} />;
}

/**
 * «Crear el proyecto de esta oportunidad», **preguntando antes**.
 *
 * La automatización que lo hacía sola al ganar está suspendida (owner, 2026-09-27): crear un proyecto es una
 * decisión. Este botón es el sí explícito, y **pide confirmación** porque el proyecto hereda el cliente y queda
 * enlazado para siempre a la oportunidad. El comando de detrás es idempotente, así que dos clics no crean dos
 * proyectos. Al terminar lleva al proyecto nuevo: es lo siguiente que quieres ver.
 */
export function CreateProjectFromOpportunityButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!confirm(t('crm.confirmCreateProject', { name }))) return;
    setBusy(true);
    setError(null);
    const res = await postJson<{ projectId: string }>(`/api/v1/opportunities/${id}/project`, {});
    setBusy(false);
    if (res.error || !res.data?.projectId) {
      setError(res.error?.message ?? t('crm.createProjectFailed'));
      return;
    }
    router.push(`/projects/${res.data.projectId}`);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={btnSecondary} disabled={busy} onClick={() => void create()}>
        {t('crm.createProject')}
      </button>
      {busy && <Spinner className="text-fg-muted" />}
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
