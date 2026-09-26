import { describe, it, expect } from 'vitest';
import { ARCHIVABLE, NOTE_TARGETS } from '@ct/application';
import { RECORDS, auditEntityTarget } from './record-registry';

/**
 * E-15 — la tabla `notes` es polimórfica y `NOTE_TARGETS` (capa de aplicación) es su allowlist. Si una entidad
 * tiene panel pero no está en esa lista, su bloque «Notas» daría error al guardar; y si el nombre no coincide
 * con el CANÓNICO de auditoría (`learning_item`, no `learning`), las notas se guardarían bajo un tipo que nadie
 * consulta. Este test ata las dos listas, igual que el de la búsqueda universal (F-34).
 */
describe('registro del panel ↔ notas', () => {
  it('toda entidad con panel admite notas, con su nombre canónico', () => {
    const missing = Object.values(RECORDS)
      .map((spec) => spec.auditEntity ?? spec.entity)
      .filter((entity) => !NOTE_TARGETS.includes(entity));
    expect(missing).toEqual([]);
  });

  it('la clave del registro y el `entity` de su spec coinciden', () => {
    // El panel se abre con `?rec=<clave>:<id>` y resuelve el spec por esa clave: si divergen, el drawer
    // pediría el registro con un nombre y guardaría con otro.
    const mismatched = Object.entries(RECORDS)
      .filter(([key, spec]) => key !== spec.entity)
      .map(([key]) => key);
    expect(mismatched).toEqual([]);
  });

  it('todo lo que la Actividad reciente puede NOMBRAR, puede abrirse', () => {
    // El feed de Inicio resuelve nombres sólo para las entidades archivables (`resolveEntityNames`), y desde el
    // 2026-09-27 ese nombre es un enlace. Si una entidad se puede nombrar pero no abrir, el feed vuelve a ser texto
    // muerto para ella sin que nadie lo note.
    const unopenable = Object.keys(ARCHIVABLE).filter((type) => auditEntityTarget(type) === null);
    expect(unopenable).toEqual([]);
  });

  it('lo que NO se puede abrir devuelve null (y no un enlace roto)', () => {
    for (const type of ['integration', 'organization', 'user', 'inbox_channel', 'automation', 'note']) {
      expect(auditEntityTarget(type), type).toBeNull();
    }
  });
});
