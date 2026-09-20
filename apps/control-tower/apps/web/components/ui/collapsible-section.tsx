import type { ReactNode } from 'react';

/**
 * Sección plegable para listas largas. Usa `<details>/<summary>` nativos: funciona **sin JavaScript** (estas páginas
 * son Server Components), es accesible por teclado de serie y el navegador se encarga del estado.
 *
 * `count` sale junto al título para saber si merece la pena abrirla sin abrirla. `defaultOpen` para lo que sí hay que
 * mirar (p. ej. envíos fallidos cuando hay alguno).
 */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group flex flex-col gap-2 border-t border-line pt-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium uppercase tracking-wide text-fg-muted hover:text-fg">
        {/* `list-none` + marcador propio: el triángulo por defecto no se puede estilar en todos los navegadores. */}
        <span aria-hidden className="text-fg-subtle transition-transform group-open:rotate-90">
          ▸
        </span>
        {title}
        {count !== undefined && <span className="font-normal text-fg-subtle">({count})</span>}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
