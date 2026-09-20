import type { ReactNode } from 'react';

/**
 * Pantalla de mensaje a página completa: 404 y errores (F-26). Misma forma para las cuatro pantallas
 * (`not-found` dentro y fuera del shell, `error` de ruta y `global-error`), para que un fallo no parezca
 * de otra aplicación distinta.
 *
 * Sin dependencias de cliente ni de i18n a propósito: `global-error.tsx` se monta cuando el layout raíz
 * ya ha fallado, así que este componente tiene que poder pintarse con lo mínimo. Los textos llegan como
 * props, ya traducidos por quien lo usa.
 */
export function MessageScreen({
  tone = 'neutral',
  title,
  hint,
  actions,
  footnote,
}: {
  /** `danger` tiñe solo el filete superior: el mensaje se lee igual, pero un fallo no se confunde con un 404. */
  tone?: 'neutral' | 'danger';
  title: string;
  hint?: string;
  actions?: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-line bg-surface p-8">
        <span
          aria-hidden="true"
          className={`h-1 w-10 rounded-full ${tone === 'danger' ? 'bg-danger' : 'bg-line-strong'}`}
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
          {hint && <p className="text-sm leading-relaxed text-fg-muted">{hint}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
        {footnote && <p className="text-xs text-fg-subtle">{footnote}</p>}
      </div>
    </div>
  );
}
