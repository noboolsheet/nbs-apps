'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Enlace que abre el panel lateral de una automatización (`?auto=<key>`) preservando el resto de la query.
 * Espeja `record-link.tsx` pero con su propio parámetro (las automatizaciones no son registros de `record-registry`).
 */
export function AutomationLink({
  automationKey,
  className,
  children,
}: {
  automationKey: string;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  params.set('auto', automationKey);
  return (
    // `scroll={false}`: abrir el panel es un cambio de query, no una navegación. Sin esto, al pulsar una
    // automatización de la mitad de la lista la página saltaba arriba y al cerrar volvía: dos saltos por consulta.
    <Link href={`${pathname}?${params.toString()}`} className={className} scroll={false}>
      {children}
    </Link>
  );
}
