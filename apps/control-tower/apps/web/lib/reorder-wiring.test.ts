import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { reorderableEntities } from '@ct/application';

/**
 * E-12 — ata la UI a la allowlist: cada `reorder={{ entityType: 'x' }}` de una vista tiene que existir en
 * `REORDERABLE`. Un nombre mal escrito (`sub_task`, `phase`…) compila igual y falla sólo al arrastrar, que es
 * exactamente el fallo que nadie ve hasta que lo usa.
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === '.next') return [];
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith('.tsx') || p.endsWith('.ts') ? [p] : [];
  });
}

describe('cableado del orden manual', () => {
  it('todo `entityType` usado en un `reorder` existe en REORDERABLE', () => {
    const root = join(__dirname, '..');
    const used = new Set<string>();
    for (const file of [...walk(join(root, 'app')), ...walk(join(root, 'components'))]) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/reorder=\{\{\s*entityType:\s*'([a-z_]+)'/g)) used.add(m[1]!);
    }
    // Si esto falla con un conjunto vacío, es que el patrón del `reorder` cambió de forma: arréglalo aquí también.
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((e) => !reorderableEntities().includes(e))).toEqual([]);
  });
});
