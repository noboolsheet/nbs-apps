import { describe, it, expect } from 'vitest';
import {
  assertServiceTransition,
  assertCapabilityTransition,
  canTransition,
  SERVICE_TRANSITIONS,
} from './transitions';
import { slugify } from './slug';

describe('service transitions', () => {
  it('permite avance válido IDEA→DESIGNING→READY→ACTIVE', () => {
    expect(() => assertServiceTransition('IDEA', 'DESIGNING')).not.toThrow();
    expect(() => assertServiceTransition('DESIGNING', 'READY')).not.toThrow();
    expect(() => assertServiceTransition('READY', 'ACTIVE')).not.toThrow();
    expect(() => assertServiceTransition('ACTIVE', 'PAUSED')).not.toThrow();
  });

  it('rechaza saltos inválidos', () => {
    expect(() => assertServiceTransition('IDEA', 'ACTIVE')).toThrow();
    expect(() => assertServiceTransition('RETIRED', 'ACTIVE')).toThrow();
  });

  it('permite quedarse en el mismo estado (no-op)', () => {
    expect(canTransition(SERVICE_TRANSITIONS, 'ACTIVE', 'ACTIVE')).toBe(true);
  });
});

describe('capability transitions', () => {
  it('valida el ciclo básico', () => {
    expect(() => assertCapabilityTransition('PLANNED', 'DEVELOPING')).not.toThrow();
    expect(() => assertCapabilityTransition('DEVELOPING', 'AVAILABLE')).not.toThrow();
    expect(() => assertCapabilityTransition('PLANNED', 'AVAILABLE')).toThrow();
  });
});

describe('opportunity stage (ADR-002)', () => {
  it('deriva el status del stage', async () => {
    const { deriveOpportunityStatus } = await import('./transitions');
    expect(deriveOpportunityStatus('LEAD')).toBe('OPEN');
    expect(deriveOpportunityStatus('WON')).toBe('WON');
    expect(deriveOpportunityStatus('LOST')).toBe('LOST');
    // ONBOARDED = ganada y cerrada (cliente incorporado) → sigue contando como GANADA.
    expect(deriveOpportunityStatus('ONBOARDED')).toBe('WON');
    // ON_HOLD es una pausa dentro de la negociación, NO un cierre.
    expect(deriveOpportunityStatus('ON_HOLD')).toBe('OPEN');
  });

  it('permite mover libremente entre estados abiertos y cerrar', async () => {
    const { assertOpportunityStageTransition } = await import('./transitions');
    expect(() => assertOpportunityStageTransition('LEAD', 'PROPOSAL_SENT')).not.toThrow();
    expect(() => assertOpportunityStageTransition('NEGOTIATION', 'WON')).not.toThrow();
    expect(() => assertOpportunityStageTransition('QUALIFIED', 'LOST')).not.toThrow();
  });

  it('WON no es terminal: se puede avanzar a ONBOARDED o volver atrás', async () => {
    // Owner 2026-09-02: WON vive en la columna «Negociación», así que un trato que se cae después de darlo por
    // ganado se puede devolver al embudo sin tocar la base de datos.
    const { assertOpportunityStageTransition } = await import('./transitions');
    expect(() => assertOpportunityStageTransition('WON', 'ONBOARDED')).not.toThrow();
    expect(() => assertOpportunityStageTransition('WON', 'NEGOTIATION')).not.toThrow();
    expect(() => assertOpportunityStageTransition('WON', 'LOST')).not.toThrow();
  });

  it('no permite reabrir una oportunidad cerrada (LOST / ONBOARDED)', async () => {
    const { assertOpportunityStageTransition } = await import('./transitions');
    expect(() => assertOpportunityStageTransition('LOST', 'PROPOSAL_SENT')).toThrow();
    expect(() => assertOpportunityStageTransition('LOST', 'LEAD')).toThrow();
    expect(() => assertOpportunityStageTransition('ONBOARDED', 'WON')).toThrow();
  });
});

describe('project transitions + derived', () => {
  it('valida transiciones de project', async () => {
    const { assertProjectTransition } = await import('./transitions');
    expect(() => assertProjectTransition('PLANNED', 'ACTIVE')).not.toThrow();
    expect(() => assertProjectTransition('ACTIVE', 'CLOSED')).not.toThrow();
    expect(() => assertProjectTransition('ARCHIVED', 'ACTIVE')).toThrow();
    expect(() => assertProjectTransition('PLANNED', 'DELIVERED')).toThrow();
  });

  it('deriva health AT_RISK cuando target_date está vencido', async () => {
    const { deriveProjectHealth } = await import('./project');
    const now = new Date('2026-06-15T12:00:00Z');
    expect(deriveProjectHealth({ status: 'ACTIVE', targetDate: '2026-05-01' }, now)).toBe('AT_RISK');
    expect(deriveProjectHealth({ status: 'ACTIVE', targetDate: '2026-12-01' }, now)).toBe('ON_TRACK');
    expect(deriveProjectHealth({ status: 'BLOCKED', targetDate: null }, now)).toBe('BLOCKED');
    expect(deriveProjectHealth({ status: 'DELIVERED', targetDate: '2026-05-01' }, now)).toBe('ON_TRACK');
  });

  it('computa progreso', async () => {
    const { computeProgress } = await import('./project');
    expect(computeProgress(0, 0)).toBe(0);
    expect(computeProgress(1, 4)).toBe(25);
    expect(computeProgress(3, 3)).toBe(100);
  });

  it('task activa bloquea cierre', async () => {
    const { isTaskActive } = await import('./transitions');
    expect(isTaskActive('IN_PROGRESS')).toBe(true);
    expect(isTaskActive('DONE')).toBe(false);
    expect(isTaskActive('CANCELLED')).toBe(false);
  });
});

describe('slugify', () => {
  it('normaliza acentos y espacios', () => {
    expect(slugify('Diseño Web Rápido')).toBe('diseno-web-rapido');
    expect(slugify('  Hello, World!  ')).toBe('hello-world');
  });
});
