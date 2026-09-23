import { AppError } from '@ct/shared';
import type { OpportunityStage } from '../enums';
import { GATE_OUTCOMES_BY_GATE, type GateKey, type GateOutcome } from './gates';

/**
 * Matriz de transiciones del SOP CLI 001 (handoff §11.3).
 *
 * Sustituye a la regla plana anterior («desde cualquier estado abierto se puede ir a cualquier
 * sitio»), que no imponía ninguna condición.
 *
 * **Devuelve un CONJUNTO de destinos, no uno solo.** La mitad de las filas del handoff dicen
 * «permanece o vuelve a X» o «ON_HOLD o LOST»: el resultado de la puerta *acota* los destinos
 * legítimos y la persona *elige* dentro de lo acotado. Esa elección queda registrada en la
 * transición, que es justo lo que pide el §11.6.
 *
 * Un beneficio que sale gratis de esta tabla: **ON_HOLD sólo es alcanzable desde PROPOSAL_SENT,
 * NEGOTIATION, CONTRACTING y WON.** Esperar una respuesta normal en LEAD o QUALIFIED no tiene
 * ningún camino hacia ON_HOLD — que es exactamente lo que exige el §11.1— sin necesidad de una
 * regla aparte que lo prohíba.
 */

export interface GateRule {
  gate: GateKey;
  /** Resultado → destinos PERMITIDOS. Incluye la propia etapa cuando «permanece» es una opción. */
  targets: Readonly<Partial<Record<GateOutcome, readonly OpportunityStage[]>>>;
}

export const SOP_MATRIX: Readonly<Record<OpportunityStage, GateRule | null>> = {
  LEAD: {
    gate: 'GATE_1',
    targets: { PASS: ['QUALIFIED'], FAIL: ['LOST'], NOT_READY: ['LEAD'], NOT_EVALUATED: ['LEAD'] },
  },
  QUALIFIED: {
    gate: 'GATE_2',
    targets: { PASS: ['RESEARCHING'], FAIL: ['LOST'], NOT_READY: ['QUALIFIED'], NOT_EVALUATED: ['QUALIFIED'] },
  },
  RESEARCHING: {
    gate: 'GATE_3',
    targets: { PASS: ['MEETING'], FAIL: ['LOST'], NOT_READY: ['RESEARCHING'], NOT_EVALUATED: ['RESEARCHING'] },
  },
  MEETING: {
    gate: 'GATE_4',
    targets: { PASS: ['EVALUATING'], FAIL: ['LOST'], NOT_READY: ['MEETING'], NOT_EVALUATED: ['MEETING'] },
  },
  EVALUATING: {
    gate: 'GATE_5',
    targets: {
      GO: ['PREPARING_PROP'],
      CONDITIONAL_GO: ['PREPARING_PROP'],
      // «Remain or return to MEETING»: las dos, y elige quien evalúa.
      NEED_MORE_INFO: ['EVALUATING', 'MEETING'],
      NO_GO: ['LOST'],
    },
  },
  PREPARING_PROP: {
    gate: 'GATE_6',
    // El PASS no basta: hace falta además un evento real de envío. Eso no se codifica aquí (la
    // matriz habla de etapas), sino como criterio obligatorio de tipo EVENT en el catálogo.
    targets: {
      PASS: ['PROPOSAL_SENT'],
      NOT_READY: ['PREPARING_PROP'],
      REEVALUATE: ['PREPARING_PROP', 'EVALUATING'],
    },
  },
  PROPOSAL_SENT: {
    gate: 'GATE_7',
    targets: {
      CHANGE_REQUESTED: ['NEGOTIATION'],
      // ACCEPTED va a CONTRACTING, NUNCA directo a WON: la Gate 9 sigue siendo obligatoria.
      ACCEPTED: ['CONTRACTING'],
      DEFERRED: ['ON_HOLD'],
      REJECTED: ['LOST'],
      NO_RESPONSE: ['LOST'],
    },
  },
  NEGOTIATION: {
    gate: 'GATE_8',
    targets: {
      PASS: ['CONTRACTING'],
      REVISE: ['PREPARING_PROP'],
      REEVALUATE: ['EVALUATING'],
      PAUSE: ['ON_HOLD'],
      FAIL: ['LOST'],
    },
  },
  CONTRACTING: {
    gate: 'GATE_9',
    targets: {
      PASS: ['WON'],
      NOT_READY: ['CONTRACTING'],
      MATERIAL_CHANGE: ['NEGOTIATION'],
      PAUSE: ['ON_HOLD'],
      FAIL: ['LOST'],
    },
  },
  WON: {
    gate: 'GATE_10',
    targets: { PASS: ['ONBOARDED'], NOT_READY: ['WON'], PAUSE: ['ON_HOLD'], FAIL: ['LOST'] },
  },
  // ON_HOLD no tiene puerta: se sale por la acción explícita de reanudación al destino GUARDADO
  // (§11.8: prohibido adivinarlo por el orden del pipeline) o cerrando a LOST.
  ON_HOLD: null,
  // Terminales del SOP. ONBOARDED cierra el ciclo de adquisición; una ampliación crea una
  // oportunidad NUEVA en Twenty, fuera de Control Tower.
  LOST: null,
  ONBOARDED: null,
};

/** Terminales del SOP: de aquí no se sale. */
const SOP_TERMINAL = new Set<OpportunityStage>(['LOST', 'ONBOARDED']);
export function isSopTerminal(stage: OpportunityStage): boolean {
  return SOP_TERMINAL.has(stage);
}

/** Puerta que gobierna la salida de una etapa, o `null` si la etapa no se sale por puerta. */
export function gateForStage(stage: OpportunityStage): GateKey | null {
  return SOP_MATRIX[stage]?.gate ?? null;
}

/** Destinos permitidos para (etapa, puerta, resultado). Vacío si la combinación no es válida. */
export function allowedTargets(
  from: OpportunityStage,
  gate: GateKey,
  outcome: GateOutcome,
): readonly OpportunityStage[] {
  const rule = SOP_MATRIX[from];
  if (!rule || rule.gate !== gate) return [];
  if (!GATE_OUTCOMES_BY_GATE[gate].includes(outcome)) return [];
  return rule.targets[outcome] ?? [];
}

export function assertSopTransition(input: {
  from: OpportunityStage;
  gate: GateKey;
  outcome: GateOutcome;
  to: OpportunityStage;
}): void {
  const { from, gate, outcome, to } = input;
  const rule = SOP_MATRIX[from];
  if (!rule) {
    throw new AppError({
      code: 'INVALID_TRANSITION',
      kind: 'VALIDATION',
      message: `La etapa ${from} no se sale evaluando una puerta.`,
      details: { from, gate, outcome, to },
    });
  }
  if (rule.gate !== gate) {
    throw new AppError({
      code: 'INVALID_TRANSITION',
      kind: 'VALIDATION',
      message: `La etapa ${from} la gobierna ${rule.gate}, no ${gate}.`,
      details: { from, gate, expectedGate: rule.gate },
    });
  }
  if (!GATE_OUTCOMES_BY_GATE[gate].includes(outcome)) {
    throw new AppError({
      code: 'INVALID_GATE_OUTCOME',
      kind: 'VALIDATION',
      message: `${outcome} no es un resultado válido de ${gate}.`,
      details: { gate, outcome, allowed: GATE_OUTCOMES_BY_GATE[gate] },
    });
  }
  const targets = rule.targets[outcome] ?? [];
  if (!targets.includes(to)) {
    throw new AppError({
      code: 'INVALID_TRANSITION',
      kind: 'VALIDATION',
      message: `Con ${gate} = ${outcome} desde ${from} no se puede ir a ${to}.`,
      details: { from, gate, outcome, to, allowed: targets },
    });
  }
}

/** LOST exige un Lost Reason observado en Twenty ANTES de escribir la etapa (§6.3 y §11.8). */
export function requiresLostReason(to: OpportunityStage): boolean {
  return to === 'LOST';
}

/** ON_HOLD exige motivo, fecha de revisión y destino de reanudación explícitos (§11.8). */
export function requiresHoldPlan(to: OpportunityStage): boolean {
  return to === 'ON_HOLD';
}

/** Sólo se reanuda al destino GUARDADO al pausar: nunca al inferido por el orden del pipeline. */
export function canResumeFromHold(resumeStage: OpportunityStage | null | undefined, to: OpportunityStage): boolean {
  return !!resumeStage && resumeStage === to;
}
