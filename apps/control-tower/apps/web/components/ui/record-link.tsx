'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Enlace que abre el panel lateral (`?rec=<entidad>:<id|new>`) **preservando el resto de la query**
 * de la lista (p. ej. el filtro `?status=`). Se usa en las filas y en el botón "Nuevo".
 */
export function RecordLink({
  entity,
  id,
  context,
  preset,
  className,
  children,
}: {
  entity: string;
  id: string;
  context?: string; // valor de `in=<ctxKey>:<parentId>` para creación contextual
  /** Valor inicial de un campo al CREAR, como `campo:valor` (p. ej. `knowledgeType:PROCESS` desde Procesos). */
  preset?: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  params.set('rec', `${entity}:${id}`);
  if (context) params.set('in', context);
  else params.delete('in');
  if (preset) params.set('set', preset);
  else params.delete('set');
  return (
    // `scroll={false}`: abrir el panel es un cambio de query, no una navegación — sin esto la página saltaba
    // arriba del todo y al cerrar volvía, dando un salto doble desde una fila del final de la lista.
    <Link href={`${pathname}?${params.toString()}`} className={className} scroll={false}>
      {children}
    </Link>
  );
}
