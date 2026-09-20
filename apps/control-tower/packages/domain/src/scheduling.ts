import type { TaskStatus } from './enums';

/**
 * Clasificación de tareas por fecha para las vistas de trabajo (Fase 4).
 * Las fechas son cadenas ISO `YYYY-MM-DD`, así que la comparación lexicográfica equivale a la temporal.
 */
export type TaskDateBucket = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'NO_DATE';

export function taskDateBucket(
  dueDate: string | null | undefined,
  today: string,
  weekEndInclusive: string,
): TaskDateBucket {
  if (!dueDate) return 'NO_DATE';
  if (dueDate < today) return 'OVERDUE';
  if (dueDate === today) return 'TODAY';
  if (dueDate <= weekEndInclusive) return 'THIS_WEEK';
  return 'UPCOMING';
}

/**
 * Bucket efectivo para la vista global de tareas, con precedencia:
 * OVERDUE (hay que reprogramar) → BLOCKED → bucket por fecha. Sólo aplica a tareas activas.
 */
export type TaskBoardBucket = 'OVERDUE' | 'BLOCKED' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'NO_DATE';

export function taskBoardBucket(
  status: TaskStatus,
  dueDate: string | null | undefined,
  today: string,
  weekEndInclusive: string,
): TaskBoardBucket {
  const byDate = taskDateBucket(dueDate, today, weekEndInclusive);
  if (byDate === 'OVERDUE') return 'OVERDUE';
  if (status === 'BLOCKED') return 'BLOCKED';
  return byDate;
}

/** Rango de prioridad para ordenar (mayor primero). */
const PRIORITY_RANK: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
export function priorityRank(priority: string): number {
  return PRIORITY_RANK[priority] ?? 0;
}
