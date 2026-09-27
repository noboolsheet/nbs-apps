import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * F-28 — **toda consulta de lista tiene que poder recibir un tope**. El tope es *opt-in* a propósito (lo pasa quien
 * pinta la página, porque las mismas funciones las usa el push a Notion y ahí recortar en silencio sería peor), pero
 * si la función no acepta `limit` **no hay manera** de ponerlo: eso es lo que esto vigila.
 *
 * Las excepciones van listadas aquí abajo con su motivo. Una `list*` nueva sin tope y sin motivo escrito falla, que es
 * justo el momento de decidir si es una lista de página o una consulta de apoyo.
 */
const SIN_TOPE_A_PROPOSITO: Record<string, string> = {
  // Consultas de APOYO: alimentan un mapa o un desplegable, no una lista paginable. Un tope aquí no recorta una
  // pantalla: **rompe** lo que se pinta con ellas (la vista de clientes mapea identidades fila a fila).
  listIdentitiesByInternalType: 'mapa de identidades por registro; recortarlo dejaría filas sin su enlace al CRM',
  listIdentitiesForRecord: 'las identidades de UN registro; son dos o tres',
  listSectors: 'opciones de un desplegable, derivadas con DISTINCT',
  listArchived: 'tiene su tope POR GRUPO dentro de la consulta (19 en paralelo)',
  // Listas acotadas por su PADRE: lo que las limita es el proyecto/tarea/cliente al que cuelgan.
  listGoalsByArea: 'objetivos de un área',
  listProjectTasks: 'tareas de un proyecto',
  listOpportunityTasks: 'tareas de una oportunidad',
  listSubtasks: 'subtareas de una tarea',
  listProjectAssets: 'reutilizables enlazados a un proyecto',
  listAssetProjects: 'proyectos que usan un reutilizable',
  listResourcesByClient: 'recursos de un cliente',
  listResourcesByProject: 'recursos de un proyecto',
  // Derivada de otra lista que SÍ tiene techo (filtra en JS lo que devuelve `listPayments`).
  listOverduePayments: 'filtra lo que devuelve `listPayments`, que es quien pone el tope',
  // Configuración: son unidades, no datos que crezcan.
  listInboxChannels: 'canales de captura configurados',
  listIntegrations: 'cinco proveedores',
  // Lo usa el push a Notion para saber qué empujar: un tope ciego dejaría de sincronizar a partir de la fila N.
  listResources: 'la usa el push a Notion; el tope lo pone quien pinte una página con ella',
};

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      if (name === 'node_modules') continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
    }
  };
  walk(dir);
  return out;
}

describe('topes de las consultas de lista (F-28)', () => {
  it('toda `list*` acepta un tope, o está en la lista de excepciones con su motivo', () => {
    const sinTope: string[] = [];
    for (const file of tsFiles(join(__dirname))) {
      const code = readFileSync(file, 'utf8');
      // Se mira el CUERPO de cada `list*` hasta el siguiente `export`: «tiene techo» es o recibir un `limit` (la
      // firma puede ocupar varias líneas) o llamar a `.limit(` con un número fijo.
      const starts = [...code.matchAll(/^export (?:async )?function (list\w+)/gm)];
      for (const [i, m] of starts.entries()) {
        const name = m[1]!;
        if (SIN_TOPE_A_PROPOSITO[name]) continue;
        const cuerpo = code.slice(m.index!, starts[i + 1]?.index ?? code.length);
        if (!/limit/.test(cuerpo.split('{')[0] ?? '') && !/\.limit\(/.test(cuerpo)) {
          sinTope.push(`${name} (${file.split('/src/')[1]})`);
        }
      }
    }
    expect(sinTope).toEqual([]);
  });

  it('las excepciones apuntadas existen de verdad (si se renombra una, hay que revisarla)', () => {
    const code = tsFiles(join(__dirname))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const fantasmas = Object.keys(SIN_TOPE_A_PROPOSITO).filter(
      (name) => !new RegExp(`export (async )?function ${name}\\(`).test(code),
    );
    expect(fantasmas).toEqual([]);
  });
});
