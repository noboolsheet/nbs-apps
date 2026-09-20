import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';

export type BoardColumn = { key: string; stages: string[] };
export type BoardCard = { id: string; stage: string; content: ReactNode };

/**
 * Kanban de oportunidades: 4 columnas, cada una agrupando varios stages del dominio (ADR-002).
 *
 * **Sin arrastrar y soltar** (owner 2026-09-02). Lo tuvo (E-12/B-1) y se ha quitado a propósito: como una columna
 * contiene **más de un estado**, soltar una tarjeta obligaba a adivinar a cuál de ellos iba —la regla era «el primer
 * stage alcanzable de la columna»—, así que el gesto no decía lo que el usuario quería decir. Ahora el estado se
 * cambia siempre en el desplegable de la tarjeta, que además es la ruta accesible por teclado.
 *
 * Sin interacción propia, el tablero es un componente de **servidor**: no manda JavaScript al navegador.
 */
export function OpportunityBoard({ columns, cards }: { columns: BoardColumn[]; cards: BoardCard[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-fg-subtle">{t('crm.boardHint')}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => {
          const colCards = cards.filter((c) => col.stages.includes(c.stage));
          return (
            <div key={col.key} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between px-1 text-sm font-medium">
                <span>{col.key}</span>
                <span className="font-normal text-fg-subtle">({colCards.length})</span>
              </div>
              <div className="flex min-h-16 flex-col gap-2 rounded-lg border border-line bg-surface-muted/50 p-2">
                {colCards.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1.5 rounded border border-line bg-surface p-2 text-sm">
                    {c.content}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
