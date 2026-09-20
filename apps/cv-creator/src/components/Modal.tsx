import React, { useEffect, useRef } from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string; // clase de ancho del panel (p. ej. max-w-md)
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Modal accesible reutilizable: cierra con Esc y clic en el fondo, atrapa el Tab
// dentro del panel, enfoca el primer elemento al abrir y devuelve el foco al
// elemento que lo abrió al cerrar. role="dialog" aria-modal.
export const Modal: React.FC<ModalProps> = ({ onClose, children, ariaLabel, className = 'max-w-md' }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;

    // Solo los elementos realmente visibles (offsetParent != null excluye display:none).
    const focusables = (): HTMLElement[] => {
      const panel = panelRef.current;
      if (!panel) return [];
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)) as HTMLElement[];
      return nodes.filter((el) => el.offsetParent !== null);
    };

    const first = focusables()[0];
    (first || panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (f.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = f[0];
        const lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${className} bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
};
