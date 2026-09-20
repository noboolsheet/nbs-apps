'use client';

import { PAYMENT_STATUS } from '@ct/domain';
import { StatusSelect } from '@/components/ui/status-select';

/** Marcar un pago como pagado/pendiente desde la propia lista, sin abrir el panel. */
export function PaymentStatusControl({ id, current }: { id: string; current: string }) {
  return (
    <StatusSelect endpoint={`/api/v1/payments/${id}/status`} field="status" current={current} options={PAYMENT_STATUS} />
  );
}
