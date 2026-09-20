'use client';

import { OPPORTUNITY_STAGE, CLIENT_STATUS } from '@ct/domain';
import { StatusSelect } from '@/components/ui/status-select';

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
