import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ARCHIVABLE, NOTE_TARGETS } from '@ct/application';
import { RECORDS, auditEntityTarget } from './record-registry';

/** Todas las vistas y componentes de la app (para las guardas que leen el CÓDIGO, no sólo el registro). */
function viewFiles(): string[] {
  const root = join(__dirname, '..');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.next') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.tsx')) out.push(p);
    }
  };
  walk(join(root, 'app'));
  walk(join(root, 'components'));
  return out;
}

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
    const files = viewFiles();

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

});

/**
 * ADR-009/ADR-010 (owner 2026-09-27): el CRM es de Twenty. **Un cliente, un contacto o una oportunidad no se
 * crean desde Control Tower**: crear uno aquí produciría un registro que no existe en el CRM, sin identidad
 * externa, que el pull nunca actualizaría y que la reconciliación no podría casar con nada.
 *
 * Cerrarlo es cosa de dos sitios y ninguno de los dos falla si se vuelve a abrir por descuido: el registro (sin
 * `createPath` ni `contextCreate`, o el panel ofrecería el formulario) y las vistas (sin botón de crear, o el
 * botón abriría un panel que ya no puede guardar). Esta guarda ata los dos.
 *
 * Ojo, lo que NO dice: los comandos `createClient`/`createContact` siguen aceptando actores USER a propósito
 * —los usa el e2e para fabricar datos— así que el candado de la API no existe y este test es lo único que
 * sostiene la decisión por el lado de la UI.
 */
describe('el CRM no se crea desde CT', () => {
  const DE_TWENTY = ['client', 'contact', 'opportunity'] as const;

  it('ni `createPath` ni creación contextual en el registro del panel', () => {
    const creables = DE_TWENTY.filter((e) => RECORDS[e]?.createPath || RECORDS[e]?.contextCreate);
    expect(creables).toEqual([]);
  });

  it('ninguna vista monta un botón de crear para ellos', () => {
    const montados: string[] = [];
    let encontrados = 0;
    for (const file of viewFiles()) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<(?:NewRecord|ContextNew)Button\s+entity="([a-z_]+)"/g)) {
        encontrados++;
        if ((DE_TWENTY as readonly string[]).includes(m[1]!)) montados.push(`${m[1]} (${file.split('/web/')[1]})`);
      }
    }
    // Si esto cae a 0, los botones cambiaron de forma y el test dejó de mirar nada: arréglalo aquí también.
    expect(encontrados).toBeGreaterThan(10);
    expect(montados).toEqual([]);
  });
});
