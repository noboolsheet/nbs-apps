import { describe, it, expect } from 'vitest';
import { REORDERABLE, reorderableEntities } from './index';

/**
 * E-12 — garantías estructurales del orden manual. No tocan base de datos: comprueban que la allowlist
 * `REORDERABLE` no pueda quedarse a medias, que es como se cuelan los fallos silenciosos en este patrón
 * (igual que `ARCHIVABLE` sin su sitio en `PURGE_ORDER`).
 */
describe('REORDERABLE', () => {
  it('toda entidad reordenable apunta a una tabla con columna `sort_order`', () => {
    // Si alguien añade una entidad sin la columna, el update fallaría en runtime con un error de SQL opaco.
    const broken = Object.entries(REORDERABLE).filter(([, m]) => {
      const cols = m.table as unknown as Record<string, { name?: string } | undefined>;
      return cols.sortOrder?.name !== 'sort_order';
    });
    expect(broken.map(([k]) => k)).toEqual([]);
  });

  it('las entidades hijas declaran su columna de padre', () => {
    // Sin `parent`, un payload podría mezclar entregables de dos proyectos y revolver los dos órdenes.
    const children = ['goal', 'project_phase', 'deliverable', 'subtask'];
    for (const key of children) {
      expect(REORDERABLE[key]?.parent, key).toBeDefined();
    }
    // Las de nivel de organización NO deben declararlo (no tienen padre dentro del que ordenar).
    for (const key of ['strategic_area', 'portfolio_item']) {
      expect(REORDERABLE[key]?.parent, key).toBeUndefined();
    }
  });

  it('una tabla sin `organization_id` declara por dónde se comprueba el aislamiento', () => {
    // `project_phases` no tiene organization_id (se acota por su proyecto, doc 5 §17). Si se diera por hecho que
    // todas la tienen, su filtro de organización sería un `undefined` silencioso: ninguna barrera.
    for (const [key, m] of Object.entries(REORDERABLE)) {
      expect(!!m.org || !!m.parentScope, key).toBe(true);
      if (!m.org) expect(m.parent, key).toBeDefined(); // el padre es lo único por lo que se puede acotar
    }
    expect(REORDERABLE.project_phase?.org).toBeUndefined();
    expect(REORDERABLE.project_phase?.parentScope).toBeDefined();
  });

  it('cada entidad declara con qué nombre se audita', () => {
    // `subtask` no es un entityType de auditoría: sus filas son `task`. Sin este puente, el historial guardaría
    // un tipo que no existe en ninguna otra parte.
    for (const [key, m] of Object.entries(REORDERABLE)) {
      expect(m.auditEntity, key).toBeTruthy();
    }
    expect(REORDERABLE.subtask?.auditEntity).toBe('task');
    expect(reorderableEntities()).toContain('subtask');
  });
});
