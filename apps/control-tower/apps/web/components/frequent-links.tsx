'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  registerVisit,
  relabel,
  topFrequent,
  rankFrequent,
  type FrequentEntry,
} from '@/lib/frequent';
import { t } from '@/lib/i18n';

/**
 * «Más usados»: accesos directos a las páginas **profundas** que más visitas (la ficha de un proyecto, una lista
 * concreta…). Se aprende solo del uso, sin configurar nada. La lógica de puntuación vive en `lib/frequent.ts`.
 *
 * Vive en `localStorage`, no en la base de datos: es una preferencia de navegación de ESTE navegador, no un dato de
 * negocio — y evita escribir en Postgres en cada clic. Se pierde al cambiar de equipo, que para esto es aceptable.
 *
 * ⚑ **Cómo se consigue la etiqueta, que es donde estaba el fallo (2026-09-27).** El nombre se toma del `<h1>` de la
 * página visitada (así sale «Web corporativa Acme» y no `/projects/<uuid>`). Antes se leía a ciegas **600 ms después**
 * de cambiar la ruta; como todas las páginas son `force-dynamic` y algunas tardan segundos, a esa altura el DOM
 * **seguía mostrando la página anterior** (Next mantiene la UI vieja hasta que llega el payload) y se guardaba la
 * ruta nueva con el **título de la página anterior**. De ahí los nombres que no correspondían con su destino.
 *
 * Ahora: se recuerda el `<h1>` que había ANTES de navegar y sólo se acepta un `<h1>` **distinto** (o el primero, si
 * venimos de una carga en frío). Se observa el DOM hasta 8 s y, si la etiqueta buena llega tarde, se **corrige** la
 * entrada sin contar otra visita. La visita se cuenta a los 1,5 s de permanencia: pasar de largo por una página no
 * la convierte en «más usada».
 */
const STORAGE_KEY = 'ct.frequentPages.v1';
const SHOWN = 4;
/** Permanencia mínima para contar la visita. Pasar de largo no cuenta. */
const DWELL_MS = 1500;
/** Cuánto se espera a que la página pinte su `<h1>` antes de rendirse y quedarse con la ruta. */
const LABEL_WAIT_MS = 8000;

function read(): FrequentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FrequentEntry[]) : [];
  } catch {
    return []; // localStorage lleno o deshabilitado: la sección simplemente no aparece
  }
}

function write(list: FrequentEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* sin espacio: no pasa nada, es una comodidad */
  }
}

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

function currentHeading(): string | null {
  return document.querySelector('main h1')?.textContent?.trim() || null;
}

export function FrequentLinks() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<FrequentEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    if (!pathname || NAV_PATHS.has(pathname)) {
      // En una sección del menú no se cuenta nada, pero sí se repunta la lista: el decaimiento depende de la fecha.
      setEntries(rankFrequent(read(), now));
      return;
    }

    // El `<h1>` que hay ANTES de que pinte la página nueva. Cualquier `<h1>` igual a éste es el de la página vieja.
    const previous = currentHeading();
    let label: string | null = null;
    let counted = false;

    const accept = (heading: string | null) => {
      if (!heading || heading === previous) return false;
      label = heading;
      return true;
    };
    accept(currentHeading()); // carga en frío: si ya está pintada, se coge directamente

    const observer = new MutationObserver(() => {
      if (!accept(currentHeading())) return;
      observer.disconnect();
      // Si la visita ya se contó con una etiqueta provisional, se corrige ahora sin sumar otra.
      if (counted && label) {
        const fixed = relabel(read(), pathname, label);
        write(fixed);
        setEntries(fixed);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const countId = window.setTimeout(() => {
      counted = true;
      const list = registerVisit(read(), pathname, label ?? pathname, Date.now());
      write(list);
      setEntries(list);
    }, DWELL_MS);

    const giveUpId = window.setTimeout(() => observer.disconnect(), LABEL_WAIT_MS);

    return () => {
      window.clearTimeout(countId);
      window.clearTimeout(giveUpId);
      observer.disconnect();
    };
  }, [pathname]);

  const top = topFrequent(entries, Date.now(), SHOWN);
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
