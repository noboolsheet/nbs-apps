import { describe, it, expect } from 'vitest';
import { OPPORTUNITY_STAGE, type OpportunityStage } from '../enums';
import { GATE_KEYS, GATE_OUTCOMES_BY_GATE, GATE_OUTCOME, isOutcomeAllowedForGate, gateNumber } from './gates';
import { SOP_MATRIX, allowedTargets, assertSopTransition, gateForStage, isSopTerminal, canResumeFromHold } from './matrix';
import { CLI_001, resolveSopCatalog } from './cli-001';
import { catalogViolations, isGateCatalogReady, assertGateCatalogReady, mandatoryCriteria } from './catalog';

const STAGES = new Set<string>(OPPORTUNITY_STAGE);

describe('invariantes de la matriz SOP', () => {
  it('cada puerta aparece exactamente una vez como gobernante de una etapa', () => {
    const used = Object.values(SOP_MATRIX).filter(Boolean).map((r) => r!.gate);
    expect([...used].sort()).toEqual([...GATE_KEYS].sort());
  });

  it('todo destino es una etapa válida del enum', () => {
    for (const rule of Object.values(SOP_MATRIX)) {
      if (!rule) continue;
      for (const targets of Object.values(rule.targets)) {
        for (const t of targets ?? []) expect(STAGES.has(t)).toBe(true);
      }
    }
  });

  it('cada resultado declarado para una puerta tiene destinos, y no hay destinos para resultados ajenos', () => {
    for (const [stage, rule] of Object.entries(SOP_MATRIX)) {
      if (!rule) continue;
      const declared = GATE_OUTCOMES_BY_GATE[rule.gate];
      for (const o of declared) {
        expect(rule.targets[o], `${stage}/${rule.gate}: falta destino para ${o}`).toBeDefined();
        expect(rule.targets[o]!.length).toBeGreaterThan(0);
      }
      for (const o of Object.keys(rule.targets)) {
        expect(declared, `${stage}: ${o} no es resultado de ${rule.gate}`).toContain(o);
      }
    }
  });

  it('sólo LOST, ONBOARDED y ON_HOLD no tienen puerta', () => {
    const sinPuerta = OPPORTUNITY_STAGE.filter((s) => SOP_MATRIX[s] === null);
    expect([...sinPuerta].sort()).toEqual(['LOST', 'ONBOARDED', 'ON_HOLD']);
    expect(isSopTerminal('LOST')).toBe(true);
    expect(isSopTerminal('ONBOARDED')).toBe(true);
    // ON_HOLD es una pausa, NO un cierre: sigue abierta.
    expect(isSopTerminal('ON_HOLD')).toBe(false);
  });

  it('todos los resultados usados están en el enum de unión', () => {
    for (const outcomes of Object.values(GATE_OUTCOMES_BY_GATE)) {
      for (const o of outcomes) expect(GATE_OUTCOME).toContain(o);
    }
  });
});

describe('reglas concretas del handoff §11.3', () => {
  it('ACCEPTED va a CONTRACTING, nunca directo a WON', () => {
    expect(allowedTargets('PROPOSAL_SENT', 'GATE_7', 'ACCEPTED')).toEqual(['CONTRACTING']);
    expect(() =>
      assertSopTransition({ from: 'PROPOSAL_SENT', gate: 'GATE_7', outcome: 'ACCEPTED', to: 'WON' }),
    ).toThrow(/no se puede ir a WON/);
  });

  it('WON no es el final: se cierra en ONBOARDED tras la Gate 10', () => {
    expect(gateForStage('WON')).toBe('GATE_10');
    expect(allowedTargets('WON', 'GATE_10', 'PASS')).toEqual(['ONBOARDED']);
  });

  it('la Gate 5 NEED_MORE_INFO permite quedarse o volver a MEETING', () => {
    expect(allowedTargets('EVALUATING', 'GATE_5', 'NEED_MORE_INFO')).toEqual(['EVALUATING', 'MEETING']);
  });

  it('las puertas 1-4 pueden cerrar a LOST con FAIL', () => {
    for (const [stage, gate] of [['LEAD', 'GATE_1'], ['QUALIFIED', 'GATE_2'], ['RESEARCHING', 'GATE_3'], ['MEETING', 'GATE_4']] as const) {
      expect(allowedTargets(stage, gate, 'FAIL')).toEqual(['LOST']);
    }
  });

  /** Sale gratis de la matriz: no hace falta una regla aparte que lo prohíba (§11.1). */
  it('ON_HOLD NO es alcanzable desde LEAD ni QUALIFIED — esperar respuesta ahí es una Next Action', () => {
    const conAccesoAHold = OPPORTUNITY_STAGE.filter((from) => {
      const rule = SOP_MATRIX[from];
      if (!rule) return false;
      return Object.values(rule.targets).some((t) => (t ?? []).includes('ON_HOLD'));
    });
    expect([...conAccesoAHold].sort()).toEqual(['CONTRACTING', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON']);
  });

  it('rechaza un resultado que no pertenece a la puerta', () => {
    expect(isOutcomeAllowedForGate('GATE_3', 'ACCEPTED')).toBe(false);
    expect(() =>
      assertSopTransition({ from: 'RESEARCHING', gate: 'GATE_3', outcome: 'ACCEPTED', to: 'MEETING' }),
    ).toThrow(/no es un resultado válido/);
  });

  it('rechaza evaluar una etapa con la puerta de otra', () => {
    expect(() => assertSopTransition({ from: 'LEAD', gate: 'GATE_5', outcome: 'GO', to: 'PREPARING_PROP' })).toThrow(
      /la gobierna GATE_1/,
    );
  });

  it('desde una terminal no se sale', () => {
    for (const t of ['LOST', 'ONBOARDED'] as OpportunityStage[]) {
      expect(() => assertSopTransition({ from: t, gate: 'GATE_1', outcome: 'PASS', to: 'LEAD' })).toThrow(
        /no se sale evaluando una puerta/,
      );
    }
  });

  it('sólo se reanuda de ON_HOLD al destino guardado, nunca al inferido', () => {
    expect(canResumeFromHold('NEGOTIATION', 'NEGOTIATION')).toBe(true);
    expect(canResumeFromHold('NEGOTIATION', 'CONTRACTING')).toBe(false);
    expect(canResumeFromHold(null, 'NEGOTIATION')).toBe(false);
  });

  it('gateNumber devuelve el número con el que lo llama el SOP', () => {
    expect(gateNumber('GATE_1')).toBe(1);
    expect(gateNumber('GATE_10')).toBe(10);
  });
});

describe('catálogo CLI 001', () => {
  it('no tiene violaciones estructurales', () => {
    expect(catalogViolations(CLI_001)).toEqual([]);
  });

  it('nace entero a la espera del SOP y ninguna puerta deja pasar todavía', () => {
    for (const gate of GATE_KEYS) {
      expect(isGateCatalogReady(CLI_001, gate)).toBe(false);
      expect(() => assertGateCatalogReady(CLI_001, gate)).toThrow(/no tiene criterios de salida/);
      expect(mandatoryCriteria(CLI_001, gate)).toEqual([]);
    }
  });

  it('las diez puertas están numeradas 1..10 y coinciden con su clave', () => {
    for (const gate of GATE_KEYS) {
      const spec = CLI_001.gates[gate];
      expect(spec.gate).toBe(gate);
      expect(spec.number).toBe(gateNumber(gate));
    }
  });

  it('los artefactos por etapa apuntan a etapas reales', () => {
    for (const stage of Object.keys(CLI_001.artifactsByStage)) expect(STAGES.has(stage)).toBe(true);
  });

  it('resolveSopCatalog es el único punto de lectura', () => {
    expect(resolveSopCatalog()).toBe(CLI_001);
  });
});
