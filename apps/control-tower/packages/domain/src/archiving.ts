/**
 * **Reglas de archivado (owner 2026-09-27).** Un solo mecanismo: la columna `archived_at`. Lo archivado sale de
 * las listas, aparece en «Ajustes › Archivados» y desde ahí se borra para siempre.
 *
 * Antes había DOS que no se hablaban: `archived_at` y un **valor de estado** `ARCHIVED` que ocho entidades
 * ofrecían en su panel (proyecto, entregable, decisión, conocimiento, reutilizable, portafolio, objetivo y área
 * estratégica). Marcar ese estado no archivaba nada: el registro seguía en su lista y no llegaba nunca a
 * Archivados ni a la purga. Aquí se cierra: el valor deja de poder elegirse (`selectableStatus`) y pasa a ser un
 * **estado terminal** que el barrido archiva de verdad (`TERMINAL_STATUS`).
 *
 * Módulo PURO: sólo nombres de estado. El mapa de tablas y la cascada viven en la capa de aplicación.
 */

/** El valor de estado que significaba «archivado» en ocho entidades. Ya no se elige a mano; lo recoge el barrido. */
export const ARCHIVED_STATUS = 'ARCHIVED';

/**
 * El mismo enum, sin los valores que ya no se ofrecen para elegir a mano. El enum original NO se toca: es el
 * contrato de la base de datos (hay CHECKs que lo referencian) y hay filas antiguas con ese valor, que se siguen
 * mostrando y traduciendo con normalidad.
 */
export function selectableStatus<T extends string>(values: readonly T[]): T[] {
  return values.filter((v) => v !== ARCHIVED_STATUS);
}

/**
 * **Estados terminales por entidad**: el trabajo ya está cerrado, así que una semana después el barrido lo archiva
 * y desaparece de la vista (owner 2026-09-27: «los que han llegado a un estado terminal … una vez a la semana se
 * mandan a una lista dedicada»).
 *
 * Criterio de lo que NO está aquí, que importa tanto como lo que sí:
 *  - **`opportunity`** tiene su propio barrido desde 2026-08-16 (`archiveClosedOpportunities`, ventana de 7 días
 *    sobre `closed_at`), porque su cierre lo marca el stage y no el `updated_at`. Además el CRM es de Twenty
 *    (ADR-009): en CT no se archiva a mano.
 *  - **`task`** se BORRA, no se archiva, por su propia política de retención (`completedTaskRetentionDays`).
 *    Archivarlas además duplicaría el circuito para la misma fila.
 *  - **`payment`** en PAID es historia contable: se conserva siempre.
 *  - **`review_item`** ya tiene su barrido (lo resuelto se borra según `reviewRetentionDays`).
 *  - **`deliverable`** entregado se queda a la vista dentro de su proyecto: es lo que demuestra qué se entregó. Se
 *    archiva **con su proyecto** (cascada), no por su cuenta; sólo el `ARCHIVED` explícito lo retira antes.
 *  - **`client`/`contact`**: los trae Twenty y aparecen o desaparecen según lo que viva allí (ADR-009/ADR-010).
 */
export const TERMINAL_STATUS: Record<string, readonly string[]> = {
  project: ['CLOSED', ARCHIVED_STATUS],
  deliverable: [ARCHIVED_STATUS],
  decision: ['SUPERSEDED', ARCHIVED_STATUS],
  knowledge_item: [ARCHIVED_STATUS],
  asset: ['DEPRECATED', ARCHIVED_STATUS],
  portfolio_item: [ARCHIVED_STATUS],
  capability: ['RETIRED'],
  service: ['RETIRED'],
  resource: ['RETIRED'],
  // Objetivo y área estratégica sólo tenían ACTIVE/ARCHIVED: su «estado» ERA el archivado. El campo desaparece de
  // su panel y estas dos entradas existen para recoger las filas que ya quedaron con ese valor.
  goal: [ARCHIVED_STATUS],
  strategic_area: [ARCHIVED_STATUS],
};
// `learning_item` NO está: su enum (PLANNED/IN_PROGRESS/COMPLETED/PAUSED) no tiene estado terminal de retirada
// —un curso terminado es justo lo que quieres seguir viendo en la ruta— así que se archiva a mano.

/** Días que un registro aguanta en un estado terminal antes de archivarse solo. «Una semana» (owner). */
export const TERMINAL_ARCHIVE_AFTER_DAYS = 7;

/**
 * Entidades cuyo archivado NO se decide en Control Tower: llegan de Twenty y **aparecen o desaparecen según lo que
 * viva allí** (owner 2026-09-27, sobre ADR-009/ADR-010). No hay botón de archivar ni de restaurar, y los comandos
 * los rechazan. Lo que sí las archiva:
 *  - la **reconciliación** del sync, cuando dejan de venir en el pull (y las restaura si vuelven);
 *  - el **ciclo de vida de la oportunidad**, que es lo único que CT gobierna del CRM (ADR-008): la columna
 *    «Cerradas» se retira del Kanban una semana después de cerrarse.
 *
 * Borrarlas para siempre desde Archivados sí se permite: es la única forma de limpiar lo que Twenty ya no tiene.
 */
export const EXTERNALLY_ARCHIVED_ENTITIES: readonly string[] = ['client', 'contact', 'opportunity'];

/** `true` si esa entidad no admite archivar/restaurar a mano desde Control Tower. */
export function isExternallyArchived(entityType: string): boolean {
  return EXTERNALLY_ARCHIVED_ENTITIES.includes(entityType);
}
