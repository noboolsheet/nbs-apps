import type { ReactNode } from 'react';
import { badgeBase, toneClasses, type Tone } from './status-tone';
import { t } from '@/lib/i18n';

/**
 * Salud del proyecto (indicador DERIVADO por el sistema; NO editable). Se calcula de estado + fecha objetivo:
 * Bloqueado (estado BLOCKED/WAITING) · En riesgo (abierto y fecha objetivo vencida) · Saludable (resto).
 * El color viene de los mismos tonos/tokens que StatusBadge (no se duplica).
 */
const HEALTH: Record<'ON_TRACK' | 'AT_RISK' | 'BLOCKED', { label: string; tone: Tone }> = {
  ON_TRACK: { label: t('health.onTrack'), tone: 'green' },
  AT_RISK: { label: t('health.atRisk'), tone: 'amber' },
  BLOCKED: { label: t('enum.BLOCKED'), tone: 'red' },
};

export function HealthBadge({ health }: { health: string }): ReactNode {
  const h = HEALTH[health as 'ON_TRACK' | 'AT_RISK' | 'BLOCKED'] ?? HEALTH.ON_TRACK;
  const { cls, icon } = toneClasses(h.tone);
  return (
    <span className={`${badgeBase} ${cls}`} title={t('health.title')}>
      <span aria-hidden>{icon}</span>
      {h.label}
    </span>
  );
}
