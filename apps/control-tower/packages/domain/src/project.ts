import type { ProjectStatus } from './enums';

/**
 * Datos derivados de Project (ERRATA-006: `health` es derivado, NO una columna). El caller
 * (capa de aplicación) provee `now` para mantener estas funciones puras y testeables.
 */
export type ProjectHealth = 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';

const CLOSED_LIKE: readonly ProjectStatus[] = ['DELIVERED', 'CLOSED', 'ARCHIVED'];

/**
 * **Por qué** la salud no es «Saludable». La salud se deriva, así que el motivo también: sin él, la ficha decía «En
 * riesgo» y no había forma de saber de qué (petición del owner). `null` cuando está saludable.
 *
 *  - `STATUS_BLOCKED` / `STATUS_WAITING`: el estado del proyecto lo dice.
 *  - `TARGET_DATE_PASSED`: sigue abierto y su fecha objetivo ya pasó. `targetDate` viaja con el motivo para poder
 *    decir *qué* fecha se pasó, que es la mitad de la información.
 */
export type ProjectHealthReason = 'STATUS_BLOCKED' | 'STATUS_WAITING' | 'TARGET_DATE_PASSED';

export interface ProjectHealthDetail {
  health: ProjectHealth;
  reason: ProjectHealthReason | null;
  /** Fecha objetivo pasada, cuando el motivo es `TARGET_DATE_PASSED` (para nombrarla en el aviso). */
  targetDate: string | null;
}

export function deriveProjectHealthDetail(
  project: { status: ProjectStatus; targetDate: string | null },
  now: Date,
): ProjectHealthDetail {
  if (project.status === 'BLOCKED') return { health: 'BLOCKED', reason: 'STATUS_BLOCKED', targetDate: null };
  if (project.status === 'WAITING') return { health: 'BLOCKED', reason: 'STATUS_WAITING', targetDate: null };
  const openish = !CLOSED_LIKE.includes(project.status);
  if (openish && project.targetDate) {
    // targetDate es DATE ('YYYY-MM-DD'); vencido si es anterior a hoy.
    const target = new Date(`${project.targetDate}T23:59:59.999Z`);
    if (target.getTime() < now.getTime()) {
      return { health: 'AT_RISK', reason: 'TARGET_DATE_PASSED', targetDate: project.targetDate };
    }
  }
  return { health: 'ON_TRACK', reason: null, targetDate: null };
}

/** Sólo la salud. Se queda como atajo: la mitad de los llamadores (listas, contadores) no necesitan el motivo. */
export function deriveProjectHealth(
  project: { status: ProjectStatus; targetDate: string | null },
  now: Date,
): ProjectHealth {
  return deriveProjectHealthDetail(project, now).health;
}

/** Progreso 0–100 en base a tasks completadas (doc 7: Active Projects con % progreso). */
export function computeProgress(doneTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) return 0;
  return Math.round((doneTasks / totalTasks) * 100);
}
