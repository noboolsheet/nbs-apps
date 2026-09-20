'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '@/lib/i18n';

/**
 * Cascarón presentacional del panel lateral (backdrop + aside + cabecera con título/cerrar + Escape). Extraído del
 * patrón de `record-panel.tsx` para reutilizarlo en paneles que NO son registros editables (p. ej. el de una
 * automatización). Cada panel aporta su contenido (`children`) y su lógica de cierre (`onClose`).
 */
export function Drawer({
  title,
  onClose,
  children,
  headerExtra,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = window.setTimeout(() => asideRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose]);

  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !asideRef.current) return;
    const focusables = Array.from(
      asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onKeyDown={trapTab}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-xl outline-none"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 id="drawer-title" className="truncate text-sm font-semibold">{title}</h2>
            {headerExtra}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="shrink-0 rounded p-1 text-fg-muted hover:bg-neutral-soft"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
