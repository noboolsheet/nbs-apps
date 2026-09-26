import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

  it('cada `ContextNewButton` del código existe en el `contextCreate` de su entidad', () => {
    // Esto es lo que hace que un objeto creado DENTRO de un padre herede el padre: si el `ctxKey` del botón no
    // está en el `contextCreate` de la entidad, el panel no fija nada, el campo del padre aparece **vacío para
    // rellenar a mano** y —peor— el POST sale sin la relación. Compila igual y sólo se nota usándolo.
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.next') continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.tsx')) files.push(p);
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'components'));

    const broken: string[] = [];
    let found = 0;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<ContextNewButton\s+entity="([a-z_]+)"\s+ctxKey="([a-z_]+)"/g)) {
        found++;
        const [, entity, ctxKey] = m;
        if (!RECORDS[entity!]?.contextCreate?.[ctxKey!]) broken.push(`${entity}@${ctxKey}`);
      }
    }
    // Si esto cae a 0, el patrón del botón cambió de forma y el test dejó de mirar nada: arréglalo aquí también.
    expect(found).toBeGreaterThan(10);
    expect(broken).toEqual([]);
  });

  it('lo que `hideFields` oculta existe en los campos de la entidad', () => {
    // Un nombre mal escrito en `hideFields` no oculta nada y no da error: el campo derivado seguiría pidiéndose.
    const wrong: string[] = [];
    for (const [key, spec] of Object.entries(RECORDS)) {
      for (const [ctx, cfg] of Object.entries(spec.contextCreate ?? {})) {
        for (const name of cfg.hideFields ?? []) {
          if (!spec.fields.some((f) => f.name === name)) wrong.push(`${key}@${ctx}:${name}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
