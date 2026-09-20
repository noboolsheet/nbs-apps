import { t } from './i18n';

/**
 * ADR-002 / ERRATA-015: la UI agrupa los stages del dominio en columnas de Kanban. 4 columnas (owner 2026-08-16)
 * para que el tablero entre en pantalla sin scroll horizontal; dentro de cada columna, cada card muestra su stage
 * exacto como etiqueta (StatusBadge). **Todo stage del dominio cae en exactamente una columna** — un stage huérfano
 * desaparecería del tablero sin dar ningún error, así que lo comprueba `opportunity-columns.test.ts`.
 *
 * Reparto de los 13 stages (owner 2026-09-02). El **orden dentro de cada columna importa**: al soltar una card, el
 * tablero elige el PRIMER stage al que la oportunidad puede moverse (ver `components/crm/opportunity-board.tsx`),
 * así que el primero de cada lista es la "entrada" natural de esa columna.
 */
export const OPPORTUNITY_COLUMNS: { key: string; stages: string[] }[] = [
  { key: t('crm.colLeadQualification'), stages: ['LEAD', 'QUALIFIED'] },
  { key: t('crm.colProposal'), stages: ['RESEARCHING', 'MEETING', 'EVALUATING', 'PREPARING_PROP', 'PROPOSAL_SENT'] },
  { key: t('crm.colNegotiation'), stages: ['NEGOTIATION', 'CONTRACTING', 'ON_HOLD', 'WON'] },
  { key: t('crm.colClosed'), stages: ['LOST', 'ONBOARDED'] },
];
