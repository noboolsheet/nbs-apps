'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/client';

/**
 * E-12 — **orden manual de una lista** (arrastrar filas, o moverlas con el teclado).
 *
 * Guarda la lista **completa en su orden nuevo** (`POST /api/v1/reorder`), no el movimiento: así dos pestañas
 * abiertas no se dejan un orden a medias, y el resultado no depende del estado de la pantalla de quien arrastró.
 *
 * El orden se aplica **optimista** —la fila se mueve al soltar, sin esperar al servidor— y se vuelve al orden del
 * servidor si la escritura falla, que es la única forma de no mentir sobre lo que quedó guardado.
 *
 * Trae **alternativa de teclado** a propósito: arrastrar con HTML5 es sólo ratón, así que el asa es un botón que
 * responde a ↑/↓. Sin eso, reordenar sería una función que no existe para quien no usa ratón.
 */
export function useReorder(entityType: string | undefined, ids: string[]) {
  const router = useRouter();
  const [order, setOrder] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragging = useRef<string | null>(null);
  const key = ids.join(',');

  // Cuando el servidor vuelve a mandar las filas (tras `router.refresh()`), su orden pasa a ser la verdad y se
  // suelta el override local. Si coincide con el optimista —el caso normal— no se ve ningún salto.
  useEffect(() => {
    setOrder(null);
  }, [key]);

  const current = order ?? ids;

  const persist = useCallback(
    async (next: string[]) => {
      if (!entityType) return;
      setOrder(next); // optimista
      setBusy(true);
      setError(null);
      const res = await postJson('/api/v1/reorder', { entityType, ids: next });
      setBusy(false);
      if (res.error) {
        setError(res.error.message);
        setOrder(null); // vuelve al orden del servidor: no se finge que se guardó
        return;
      }
      router.refresh();
    },
    [entityType, router],
  );

  /** Mueve `id` a la posición de `beforeId` (soltar encima de esa fila). */
  const moveBefore = useCallback(
    (id: string, beforeId: string) => {
      if (id === beforeId) return;
      const next = current.filter((x) => x !== id);
      const at = next.indexOf(beforeId);
      if (at < 0) return;
      next.splice(at, 0, id);
      void persist(next);
    },
    [current, persist],
  );

  /** Mueve `id` una posición arriba (`-1`) o abajo (`+1`). Es la vía de teclado. */
  const moveBy = useCallback(
    (id: string, delta: -1 | 1) => {
      const from = current.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= current.length) return;
      const next = [...current];
      next.splice(to, 0, ...next.splice(from, 1));
      void persist(next);
    },
    [current, persist],
  );

  return {
    /** Orden a pintar (optimista si hay un movimiento sin confirmar). */
    order: current,
    busy,
    error,
    moveBefore,
    moveBy,
    /** Props del ASA de una fila: arrastrar con ratón, ↑/↓ con teclado. */
    handleProps: (id: string) => ({
      draggable: true,
      onDragStart: () => {
        dragging.current = id;
      },
      onDragEnd: () => {
        dragging.current = null;
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault(); // si no, la página hace scroll y la fila parece no moverse
          moveBy(id, e.key === 'ArrowUp' ? -1 : 1);
        }
      },
    }),
    /** Props de la FILA: acepta que se suelte encima (el destino es la fila entera, no sólo su asa). */
    rowProps: (id: string) => ({
      onDragOver: (e: React.DragEvent) => {
        if (dragging.current && dragging.current !== id) e.preventDefault(); // habilita el drop
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const from = dragging.current;
        dragging.current = null;
        if (from) moveBefore(from, id);
      },
    }),
  };
}
