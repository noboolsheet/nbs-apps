import type { ProjectStatus } from './enums';

/**
 * Datos derivados de Project (ERRATA-006: `health` es derivado, NO una columna). El caller
 * (capa de aplicación) provee `now` para mantener estas funciones puras y testeables.
 */
export type ProjectHealth = 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';

const CLOSED_LIKE: readonly ProjectStatus[] = ['DELIVERED', 'CLOSED', 'ARCHIVED'];

export function deriveProjectHealth(
  project: { status: ProjectStatus; targetDate: string | null },
  now: Date,
): ProjectHealth {
  if (project.status === 'BLOCKED' || project.status === 'WAITING') return 'BLOCKED';
  const openish = !CLOSED_LIKE.includes(project.status);
  if (openish && project.targetDate) {
    // targetDate es DATE ('YYYY-MM-DD'); vencido si es anterior a hoy.
    const target = new Date(`${project.targetDate}T23:59:59.999Z`);
    if (target.getTime() < now.getTime()) return 'AT_RISK';
  }
  return 'ON_TRACK';
}

/** Progreso 0–100 en base a tasks completadas (doc 7: Active Projects con % progreso). */
export function computeProgress(doneTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) return 0;
  return Math.round((doneTasks / totalTasks) * 100);
}
