import { describe, it, expect } from 'vitest';
import { OPPORTUNITY_STAGE, CLOSED_OPPORTUNITY_STAGES, canChangeOpportunityStage, type OpportunityStage } from '@ct/domain';
import { OPPORTUNITY_COLUMNS } from './opportunity-columns';

/** El Kanban reparte los stages del dominio entre 4 columnas; un stage sin columna se caería del tablero en silencio. */
describe('columnas del Kanban de oportunidades', () => {
  const asignados = OPPORTUNITY_COLUMNS.flatMap((c) => c.stages);

  it('cada stage del dominio está en exactamente una columna', () => {
    expect([...asignados].sort()).toEqual([...OPPORTUNITY_STAGE].sort());
  });

  it('la última columna es la de cierre (la que se auto-archiva)', () => {
    expect(OPPORTUNITY_COLUMNS.at(-1)!.stages).toEqual([...CLOSED_OPPORTUNITY_STAGES]);
  });

  it('desde cualquier stage abierto se puede soltar en cualquier columna', () => {
    // El tablero elige el primer stage alcanzable de la columna destino: si no hubiera ninguno, el arrastre
    // fallaría con un aviso en vez de mover la card.
    const abiertos = OPPORTUNITY_STAGE.filter((s) => !CLOSED_OPPORTUNITY_STAGES.includes(s));
    for (const from of abiertos) {
      for (const col of OPPORTUNITY_COLUMNS) {
        const destino = col.stages.find((to) => canChangeOpportunityStage(from, to as OpportunityStage));
        expect(destino, `${from} → ${col.key}`).toBeDefined();
      }
    }
  });
});
