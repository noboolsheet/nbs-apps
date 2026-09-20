'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';

/**
 * «Más usados»: accesos directos a las páginas **profundas** que más visitas (la ficha de un proyecto, una lista
 * concreta…). Se aprende solo del uso, sin configurar nada.
 *
 * Vive en `localStorage`, no en la base de datos: es una preferencia de navegación de ESTE navegador, no un dato de
 * negocio — y evita escribir en Postgres en cada clic. Se pierde al cambiar de equipo, que para esto es aceptable.
 *
 * Va **abierto por defecto**: su razón de ser es que se vean.
 *
 * La etiqueta se toma del `<h1>` de la página visitada (así sale «Web corporativa Acme» y no `/projects/<uuid>`), con
 * la ruta como respaldo. Las secciones que ya están en el menú se excluyen: repetirlas sería ruido.
 */
const STORAGE_KEY = 'ct.frequentPages.v1';
const MAX_TRACKED = 60;
const SHOWN = 4;

type Entry = { path: string; label: string; count: number; last: number };

/** Rutas que ya tienen su sitio en la navegación principal: no se ofrecen como "más usadas". */
const NAV_PATHS = new Set([
  '/',
  '/business',
  '/crm',
  '/projects',
  '/knowledge',
  '/portfolio',
  '/payments',
  '/automation',
  '/settings',
]);

function read(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return []; // localStorage lleno o deshabilitado: la sección simplemente no aparece
  }
}

export function FrequentLinks() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (!pathname || NAV_PATHS.has(pathname)) {
      setEntries(read());
      return;
    }
    // Un pequeño retardo para que la página haya pintado su <h1> antes de leerlo.
    const id = window.setTimeout(() => {
      const label = document.querySelector('main h1')?.textContent?.trim() || pathname;
      const list = read();
      const found = list.find((e) => e.path === pathname);
      if (found) {
        found.count += 1;
        found.last = Date.now();
        found.label = label; // el nombre puede haber cambiado (se renombró el proyecto)
      } else {
        list.push({ path: pathname, label, count: 1, last: Date.now() });
      }
      // Se conservan las más usadas y, a igualdad, las más recientes.
      const trimmed = list.sort((a, b) => b.count - a.count || b.last - a.last).slice(0, MAX_TRACKED);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        /* sin espacio: no pasa nada, es una comodidad */
      }
      setEntries(trimmed);
    }, 600);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const top = entries.filter((e) => e.count > 1).slice(0, SHOWN);
  if (top.length === 0) return null; // hasta que haya costumbre, no se enseña nada

  return (
    <details open className="group mt-2 border-t border-line pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1 px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-fg-subtle hover:text-fg-muted">
        <span aria-hidden className="transition-transform group-open:rotate-90">
          ▸
        </span>
        {t('nav.frequent')}
      </summary>
      <div className="mt-1 flex flex-col gap-0.5">
        {top.map((e) => (
          <Link
            key={e.path}
            href={e.path}
            title={e.label}
            className="truncate rounded px-2 py-1 text-sm text-fg-muted hover:bg-neutral-soft"
          >
            {e.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
