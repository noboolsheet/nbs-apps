/**
 * Puertas del SOP «CLI 001 — Adquisición de Clientes y Pre-Onboarding» (handoff §11.3).
 *
 * Diez puertas, una por etapa activa. Una puerta es el ÚNICO mecanismo que habilita un cambio de
 * etapa: ni el tiempo transcurrido, ni un recordatorio, ni crear un documento, ni la completitud
 * administrativa mueven nada por sí solos (§11.1).
 */

export const GATE_KEYS = [
  'GATE_1',
  'GATE_2',
  'GATE_3',
  'GATE_4',
  'GATE_5',
  'GATE_6',
  'GATE_7',
  'GATE_8',
  'GATE_9',
  'GATE_10',
] as const;
export type GateKey = (typeof GATE_KEYS)[number];

/**
 * Resultados posibles, como UNIÓN de todos los vocabularios.
 *
 * Por qué uno y no un enum por puerta: `outcome` es UNA columna, así que su CHECK sólo puede ser
 * sobre la unión de todo; y el vocabulario se solapa mucho (`PASS` aparece en siete puertas,
 * `NOT_READY` en cuatro, `REEVALUATE` en dos). Lo que impide registrar `ACCEPTED` en la Gate 3 no es
 * el tipo, es `GATE_OUTCOMES_BY_GATE`, que se valida en dominio y en Zod.
 */
export const GATE_OUTCOME = [
  // Puertas 1-4 (y PASS/NOT_READY reaparecen en 6, 9 y 10)
  'PASS',
  'FAIL',
  'NOT_READY',
  'NOT_EVALUATED',
  // Gate 5 — Proposal Readiness
  'GO',
  'CONDITIONAL_GO',
  'NEED_MORE_INFO',
  'NO_GO',
  // Gate 7 — Response Classification
  'ACCEPTED',
  'CHANGE_REQUESTED',
  'DEFERRED',
  'REJECTED',
  'NO_RESPONSE',
  // Gates 6 / 8 / 9
  'REVISE',
  'REEVALUATE',
  'PAUSE',
  'MATERIAL_CHANGE',
] as const;
export type GateOutcome = (typeof GATE_OUTCOME)[number];

/**
 * Qué resultados admite cada puerta.
 *
 * ⚠ `NO_RESPONSE` (Gate 7) y `MATERIAL_CHANGE` (Gate 9) están DEDUCIDOS del texto del handoff
 * («política de no-respuesta completada», «cambio material»), que no les da un código. Pendiente de
 * confirmar contra los documentos del SOP; si allí se llaman de otra forma, se renombran aquí y en
 * el diccionario de i18n, y nada más.
 */
export const GATE_OUTCOMES_BY_GATE: Readonly<Record<GateKey, readonly GateOutcome[]>> = {
  GATE_1: ['PASS', 'FAIL', 'NOT_READY', 'NOT_EVALUATED'],
  GATE_2: ['PASS', 'FAIL', 'NOT_READY', 'NOT_EVALUATED'],
  GATE_3: ['PASS', 'FAIL', 'NOT_READY', 'NOT_EVALUATED'],
  GATE_4: ['PASS', 'FAIL', 'NOT_READY', 'NOT_EVALUATED'],
  GATE_5: ['GO', 'CONDITIONAL_GO', 'NEED_MORE_INFO', 'NO_GO'],
  GATE_6: ['PASS', 'NOT_READY', 'REEVALUATE'],
  GATE_7: ['ACCEPTED', 'CHANGE_REQUESTED', 'DEFERRED', 'REJECTED', 'NO_RESPONSE'],
  GATE_8: ['PASS', 'REVISE', 'REEVALUATE', 'PAUSE', 'FAIL'],
  GATE_9: ['PASS', 'NOT_READY', 'MATERIAL_CHANGE', 'PAUSE', 'FAIL'],
  GATE_10: ['PASS', 'NOT_READY', 'PAUSE', 'FAIL'],
};

export function isOutcomeAllowedForGate(gate: GateKey, outcome: GateOutcome): boolean {
  return GATE_OUTCOMES_BY_GATE[gate].includes(outcome);
}

/** Número de la puerta tal y como la nombra el SOP (Gate 1 … Gate 10). */
export function gateNumber(gate: GateKey): number {
  return Number(gate.slice('GATE_'.length));
}

/** Estado de una evaluación. `VOIDED` = anulada (p. ej. el catálogo cambió antes de registrarla). */
export const GATE_EVALUATION_STATUS = ['OPEN', 'RECORDED', 'VOIDED'] as const;
export type GateEvaluationStatus = (typeof GATE_EVALUATION_STATUS)[number];

/** Ciclo de vida de una petición de transición (§11.6). */
export const TRANSITION_STATUS = ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] as const;
export type TransitionStatus = (typeof TRANSITION_STATUS)[number];

/**
 * Qué clase de transición es. `RESTORE_EXTERNAL` es la acción controlada de reconciliación que
 * reescribe en Twenty el último estado confirmado por CT (§11.7).
 */
export const TRANSITION_KIND = ['GATE', 'RESUME', 'CLOSE_LOST', 'RESTORE_EXTERNAL', 'OVERRIDE'] as const;
export type TransitionKind = (typeof TRANSITION_KIND)[number];

/** Estado de divergencia entre lo que dice Twenty y lo último que CT confirmó (§11.7). */
export const PROCESS_DIVERGENCE = ['NONE', 'STAGE_DIVERGENCE'] as const;
export type ProcessDivergence = (typeof PROCESS_DIVERGENCE)[number];

/**
 * Artefactos de Drive del SOP (§11.5). CT sólo guarda la URL que pega el usuario: no crea carpetas
 * ni documentos (decisión del owner), y la service-account de Drive sigue siendo de solo lectura.
 */
export const ARTIFACT_KIND = ['AP_001', 'RE_001', 'DP_001', 'PC_001', 'CONTRACT', 'HO_001', 'FINAL_SNAPSHOT'] as const;
export type ArtifactKind = (typeof ARTIFACT_KIND)[number];

/** Causas que la pantalla de reconciliación tiene que saber mostrar (handoff §9). */
export const RECONCILIATION_KIND = [
  'STAGE_DIVERGENCE',
  'WRITE_FAILED',
  'UNKNOWN_ENUM',
  'SCHEMA_MISMATCH',
  'BROKEN_LINK',
] as const;
export type ReconciliationKind = (typeof RECONCILIATION_KIND)[number];
