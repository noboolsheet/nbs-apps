import { describe, it, expect } from 'vitest';
import { AUTOMATION_CATALOG, getAutomationSpec } from './catalog';

/**
 * Invariantes del catálogo (unitario, sin DB). Evita que el catálogo se desincronice de las guardas del worker:
 * cada sync debe tener provider, cada sweep su tipo, y el núcleo no debe ser toggleable/runnable.
 */
describe('AUTOMATION_CATALOG', () => {
  it('tiene claves únicas', () => {
    const keys = AUTOMATION_CATALOG.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('respeta las invariantes por tipo', () => {
    for (const a of AUTOMATION_CATALOG) {
      if (a.kind === 'core') {
        expect(a.toggleable, `${a.key} core no toggleable`).toBe(false);
        expect(a.runnable, `${a.key} core no runnable`).toBe(false);
      } else {
        expect(a.toggleable, `${a.key} no-core toggleable`).toBe(true);
      }
      if (a.kind === 'sync') {
        expect(a.provider, `${a.key} sync con provider`).toBeTruthy();
        expect(a.runnable).toBe(true);
      }
      if (a.kind === 'sweep') {
        expect(a.sweep, `${a.key} sweep con tipo`).toBeTruthy();
        expect(a.runnable).toBe(true);
      }
      if (a.kind === 'event') {
        expect(a.runnable, `${a.key} event no runnable`).toBe(false);
      }
      // runnable ⇒ sync (con provider) o sweep (con tipo)
      if (a.runnable) expect(Boolean(a.provider) || Boolean(a.sweep)).toBe(true);
    }
  });

  it('cubre el conjunto canónico de automatizaciones', () => {
    const byKind = (k: string) => AUTOMATION_CATALOG.filter((a) => a.kind === k).map((a) => a.key).sort();
    expect(byKind('core')).toEqual(['engine.jobs', 'engine.outbox', 'engine.scheduler']);
    expect(byKind('event')).toEqual(['event.notion_push', 'event.opportunity_won', 'event.twenty_push']);
    expect(byKind('sync')).toEqual([
      'sync.gcalendar',
      'sync.gdrive',
      'sync.github',
      'sync.notion',
      'sync.twenty',
    ]);
    expect(byKind('sweep')).toEqual([
      'sweep.archived_purge',
      'sweep.inbox_purge',
      'sweep.opportunity_archive',
      'sweep.retention',
      'sweep.review_purge',
    ]);
  });

  it('los syncs mapean a un provider conocido', () => {
    const providers = AUTOMATION_CATALOG.filter((a) => a.kind === 'sync').map((a) => a.provider);
    expect(providers.sort()).toEqual(['GCALENDAR', 'GDRIVE', 'GITHUB', 'NOTION', 'TWENTY']);
  });

  it('getAutomationSpec resuelve por clave', () => {
    expect(getAutomationSpec('sync.notion')?.title).toBe('Sincronización Notion');
    expect(getAutomationSpec('inexistente')).toBeUndefined();
  });
});
