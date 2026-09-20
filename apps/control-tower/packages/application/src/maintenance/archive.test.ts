import { describe, it, expect } from 'vitest';
import { ARCHIVABLE, purgeOrderMissingEntities } from './archive';

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
