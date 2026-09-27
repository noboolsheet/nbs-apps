import { describe, it, expect } from 'vitest';
import {
  ARCHIVED_STATUS,
  TERMINAL_STATUS,
  EXTERNALLY_ARCHIVED_ENTITIES,
  isExternallyArchived,
  selectableStatus,
  TERMINAL_ARCHIVE_AFTER_DAYS,
} from './archiving';
import {
  PROJECT_STATUS,
  DELIVERABLE_STATUS,
  DECISION_STATUS,
  KNOWLEDGE_ITEM_STATUS,
  ASSET_STATUS,
  PORTFOLIO_ITEM_STATUS,
  CAPABILITY_STATUS,
  SERVICE_STATUS,
  RESOURCE_STATUS,
  LIFECYCLE_STATUS,
} from './enums';

/** El enum de cada entidad que declara estados terminales. Sólo para poder comprobar que existen de verdad. */
const ENUM_BY_ENTITY: Record<string, readonly string[]> = {
  project: PROJECT_STATUS,
  deliverable: DELIVERABLE_STATUS,
  decision: DECISION_STATUS,
  knowledge_item: KNOWLEDGE_ITEM_STATUS,
  asset: ASSET_STATUS,
  portfolio_item: PORTFOLIO_ITEM_STATUS,
  capability: CAPABILITY_STATUS,
  service: SERVICE_STATUS,
  resource: RESOURCE_STATUS,
  goal: LIFECYCLE_STATUS,
  strategic_area: LIFECYCLE_STATUS,
};

describe('estados terminales que archivan', () => {
  /**
   * La trampa de un mapa de strings: un estado mal escrito (o retirado del enum) no falla, simplemente **no
   * archiva nunca nada** y nadie se enteraría. Esto ata las dos listas.
   */
  it('todo estado terminal existe de verdad en el enum de su entidad', () => {
    const inventados: string[] = [];
    for (const [entity, statuses] of Object.entries(TERMINAL_STATUS)) {
      const values = ENUM_BY_ENTITY[entity];
      expect(values, `falta el enum de ${entity} en el test`).toBeTruthy();
      for (const s of statuses) if (!values!.includes(s)) inventados.push(`${entity}.${s}`);
    }
    expect(inventados).toEqual([]);
  });

  it('ninguna entidad de Twenty se archiva por estado (aparecen y desaparecen según el CRM)', () => {
    for (const entity of EXTERNALLY_ARCHIVED_ENTITIES) {
      expect(TERMINAL_STATUS[entity], entity).toBeUndefined();
      expect(isExternallyArchived(entity)).toBe(true);
    }
    expect(isExternallyArchived('project')).toBe(false);
  });

  it('las tareas no entran: se borran por retención, no se archivan por estado', () => {
    expect(TERMINAL_STATUS.task).toBeUndefined();
  });

  it('la ventana es de una semana', () => {
    expect(TERMINAL_ARCHIVE_AFTER_DAYS).toBe(7);
  });
});

describe('el estado ARCHIVED ya no se elige a mano', () => {
  it('`selectableStatus` lo quita y deja el resto en orden', () => {
    expect(selectableStatus(PROJECT_STATUS)).toEqual([
      'PLANNED',
      'ACTIVE',
      'BLOCKED',
      'WAITING',
      'REVIEW',
      'DELIVERED',
      'CLOSED',
    ]);
    expect(selectableStatus(DECISION_STATUS)).not.toContain(ARCHIVED_STATUS);
    // Un enum que no lo tiene se queda igual (no hay que acordarse de nada al añadir uno nuevo).
    expect(selectableStatus(CAPABILITY_STATUS)).toEqual([...CAPABILITY_STATUS]);
  });

  it('pero sigue siendo un estado válido del modelo (hay filas con él y un CHECK que lo admite)', () => {
    expect(PROJECT_STATUS).toContain(ARCHIVED_STATUS);
    expect(TERMINAL_STATUS.project).toContain(ARCHIVED_STATUS);
  });
});
