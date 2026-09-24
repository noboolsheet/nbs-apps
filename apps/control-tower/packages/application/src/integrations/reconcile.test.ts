import { describe, it, expect } from 'vitest';
import { NOTION_BIDIRECTIONAL_TYPES } from './notion-specs';
import { ARCHIVABLE } from '../maintenance/archive';

/**
 * M40 — la reconciliación de borrados ARCHIVA, así que sólo puede aplicarse a entidades archivables.
 * `reconcileMissing` degrada a no-op (con warning) si la entidad no está en `ARCHIVABLE`, que es lo correcto
 * en producción —no tumbar el sync— pero significa que una entidad mal declarada dejaría de reconciliar en
 * silencio: las páginas borradas en Notion se quedarían colgando en CT sin que nadie se entere. Esto lo caza.
 */
describe('reconciliación de borrados', () => {
  it('toda spec bidireccional de Notion apunta a una entidad archivable', () => {
    const missing = NOTION_BIDIRECTIONAL_TYPES.filter((t) => !ARCHIVABLE[t]);
    expect(missing).toEqual([]);
  });

  it('las entidades que reconcilian los demás syncs son archivables', () => {
    // GitHub → asset · Twenty → client/contact/opportunity/task · Drive → document.
    const reconciled = ['asset', 'client', 'contact', 'opportunity', 'task', 'document'];
    expect(reconciled.filter((t) => !ARCHIVABLE[t])).toEqual([]);
  });
});
