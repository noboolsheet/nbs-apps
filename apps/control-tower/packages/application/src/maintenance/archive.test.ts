import { describe, it, expect } from 'vitest';
import { TERMINAL_STATUS } from '@ct/domain';
import { ARCHIVABLE, archiveCascadePairs, purgeOrderMissingEntities } from './archive';

/**
 * Guardia de regresión: `payment` y `review_item` estaban en `ARCHIVABLE` pero NO en `PURGE_ORDER`, así que se
 * archivaban y no se purgaban nunca — en silencio, sin error ni aviso. Al añadir una entidad archivable hay que
 * darle su sitio en el orden de purga (hijo→padre); este test lo obliga.
 */
describe('purga de archivados', () => {
  it('el orden de purga cubre TODAS las entidades archivables', () => {
    expect(purgeOrderMissingEntities()).toEqual([]);
  });

  it('toda entidad archivable declara tabla, columna de nombre y etiqueta', () => {
    for (const [key, meta] of Object.entries(ARCHIVABLE)) {
      expect(meta.table, key).toBeTruthy();
      expect(meta.nameCol, key).toBeTruthy();
      expect(meta.label, key).toBeTruthy();
    }
  });
});

/**
 * Cascada (owner 2026-09-27): archivar un padre archiva a los hijos que no significan nada sin él. Dos formas de
 * que eso se rompa en silencio y ninguna da error: un hijo que NO es archivable (la columna `archived_at` no
 * existiría y el update fallaría sólo al usarlo) y un padre declarado que no se archiva nunca.
 */
describe('cascada de archivado', () => {
  it('todo hijo de la cascada es una entidad archivable', () => {
    const invalidos = archiveCascadePairs()
      .filter(({ child }) => !ARCHIVABLE[child])
      .map(({ parent, child }) => `${parent}→${child}`);
    expect(invalidos).toEqual([]);
  });

  it('todo padre de la cascada es una entidad archivable', () => {
    const invalidos = archiveCascadePairs()
      .filter(({ parent }) => !ARCHIVABLE[parent])
      .map(({ parent }) => parent);
    expect(invalidos).toEqual([]);
  });

  it('un proyecto arrastra sus tareas y sus entregables', () => {
    // Son los dos hijos que bloqueaban la purga del proyecto para siempre (`deliverables.project_id` es NOT NULL).
    const hijos = archiveCascadePairs().filter((p) => p.parent === 'project').map((p) => p.child);
    expect(hijos.sort()).toEqual(['deliverable', 'task']);
  });
});

/** El autoarchivado por estado sólo puede mirar entidades que se puedan archivar. */
describe('autoarchivado por estado terminal', () => {
  it('toda entidad con estados terminales es archivable', () => {
    const noArchivables = Object.keys(TERMINAL_STATUS).filter((e) => !ARCHIVABLE[e]);
    expect(noArchivables).toEqual([]);
  });
});
