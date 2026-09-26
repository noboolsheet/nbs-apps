import { describe, it, expect } from 'vitest';
import { deriveProjectHealthDetail, deriveProjectHealth, computeProgress } from './project';

/**
 * Salud derivada de un proyecto y, sobre todo, **su motivo** (petición del owner 2026-09-27: «En riesgo» sin decir
 * de qué no sirve). El motivo es lo que la ficha pinta, así que si deja de coincidir con la salud, la ficha miente.
 */
const now = new Date('2026-09-27T12:00:00Z');

describe('salud de un proyecto', () => {
  it('saludable: sin motivo que explicar', () => {
    const d = deriveProjectHealthDetail({ status: 'ACTIVE', targetDate: '2027-01-01' }, now);
    expect(d).toEqual({ health: 'ON_TRACK', reason: null, targetDate: null });
  });

  it('bloqueado y en espera son BLOCKED, con motivos distintos', () => {
    expect(deriveProjectHealthDetail({ status: 'BLOCKED', targetDate: null }, now)).toMatchObject({
      health: 'BLOCKED',
      reason: 'STATUS_BLOCKED',
    });
    expect(deriveProjectHealthDetail({ status: 'WAITING', targetDate: null }, now)).toMatchObject({
      health: 'BLOCKED',
      reason: 'STATUS_WAITING',
    });
  });

  it('fecha objetivo pasada con el proyecto abierto: AT_RISK, y devuelve QUÉ fecha se pasó', () => {
    const d = deriveProjectHealthDetail({ status: 'ACTIVE', targetDate: '2026-09-01' }, now);
    expect(d).toEqual({ health: 'AT_RISK', reason: 'TARGET_DATE_PASSED', targetDate: '2026-09-01' });
  });

  it('un proyecto ya cerrado con fecha pasada NO está en riesgo', () => {
    // Lo contrario llenaría la ficha (y el aviso de Inicio) de proyectos terminados hace meses.
    for (const status of ['DELIVERED', 'CLOSED', 'ARCHIVED'] as const) {
      expect(deriveProjectHealthDetail({ status, targetDate: '2026-01-01' }, now).health).toBe('ON_TRACK');
    }
  });

  it('el atajo `deriveProjectHealth` devuelve lo mismo que el detalle', () => {
    // Las listas usan el atajo y la ficha el detalle: si se separan, la insignia y el motivo se contradicen.
    const cases = [
      { status: 'ACTIVE', targetDate: '2026-09-01' },
      { status: 'BLOCKED', targetDate: null },
      { status: 'WAITING', targetDate: '2027-01-01' },
      { status: 'PLANNED', targetDate: null },
      { status: 'CLOSED', targetDate: '2026-01-01' },
    ] as const;
    for (const c of cases) {
      expect(deriveProjectHealth(c, now)).toBe(deriveProjectHealthDetail(c, now).health);
    }
  });

  it('progreso: 0 sin tareas y redondeado al entero', () => {
    expect(computeProgress(0, 0)).toBe(0);
    expect(computeProgress(1, 3)).toBe(33);
    expect(computeProgress(3, 3)).toBe(100);
  });
});
