import type { ReactNode } from 'react';
import { statusTone, badgeBase } from './status-tone';
import { enumLabel } from '@/lib/labels';

/** Badge de estado (solo lectura). Color por estado + icono + etiqueta (nunca sólo color, doc 6/7 §17). */
export function StatusBadge({ status }: { status: string }): ReactNode {
  const { cls, icon } = statusTone(status);
  return (
    <span className={`${badgeBase} ${cls}`}>
      <span aria-hidden>{icon}</span>
      {enumLabel(status)}
    </span>
  );
}
