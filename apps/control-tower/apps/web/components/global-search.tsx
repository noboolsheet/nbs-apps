'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { t, type MessageKey } from '@/lib/i18n';

interface Hit {
  type: string;
  id: string;
  title: string;
  href: string;
}
interface Group {
  type: string;
  label: string;
  items: Hit[];
}

/** Global Search (⌘K) — command palette con resultados agrupados por entidad (doc 7 §3). */
/**
 * Nombre visible del grupo. El texto de interfaz vive en el diccionario, no en la capa de aplicación: `g.label`
 * queda sólo como red de seguridad por si algún día se añade un tipo al buscador y se olvida su clave aquí.
 */
function groupLabel(g: Group): string {
  const key = `search.type.${g.type}` as MessageKey;
  const label = t(key);
  return label === key ? g.label : label;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Atajo ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    setQ('');
    setGroups([]);
    restoreFocusRef.current?.focus?.(); // restaura el foco al cerrar
    return undefined;
  }, [open]);

  // Focus-trap: mantiene el Tab dentro del modal de búsqueda.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const f = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (f.length === 0) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const runSearch = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
      const json = (await res.json()) as { data?: { groups: Group[] } };
      setGroups(json.data?.groups ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => void runSearch(q), 200);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded border border-line-strong px-2 py-1 text-sm text-fg-muted"
      >
        <span>{t('search.trigger')}</span>
        <kbd className="rounded bg-surface-muted px-1 text-xs">{t('ui.k')}</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24" onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('search.dialogLabel')}
            onKeyDown={trapTab}
            className="w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none"
            />
            <div className="max-h-96 overflow-y-auto p-2">
              {loading && <p className="px-2 py-3 text-sm text-fg-muted">{t('search.searching')}</p>}
              {!loading && q.trim() && groups.length === 0 && (
                <p className="px-2 py-3 text-sm text-fg-muted">{t('search.noResults', { q })}</p>
              )}
              {groups.map((g) => (
                <div key={g.type} className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">{groupLabel(g)}</div>
                  {g.items.map((it) => (
                    <button
                      key={`${it.type}-${it.id}`}
                      type="button"
                      onClick={() => go(it.href)}
                      className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-soft"
                    >
                      {it.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
