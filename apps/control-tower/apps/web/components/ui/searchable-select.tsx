'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';

/** Un elemento seleccionable de la lista (en el orden en que se renderiza), para navegar con las flechas. */
type Item = { value: string; label: string };

/**
 * Desplegable con FILTRO de texto. Muestra la opción elegida; al abrir, un campo para filtrar entre las
 * opciones y una lista con **scroll** (max-h) cuando crece. Pensado para listas que se hacen grandes
 * (clientes, contactos…). Componente controlado: `value` + `onChange`.
 *
 * Con `allowCustom` funciona como un combobox de texto libre (p. ej. "Sector"): las opciones son
 * SUGERENCIAS y el usuario puede además teclear un valor nuevo (Enter o la fila «Usar «…»»). En ese modo
 * `value`/opciones son cadenas (value === label) y el valor tecleado se usa tal cual.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = t('common.select'),
  emptyLabel,
  allowCustom = false,
  block = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  emptyLabel?: string; // etiqueta de la opción "sin selección" (value '')
  allowCustom?: boolean; // permite teclear un valor nuevo que no está en las sugerencias (texto libre)
  /** `true` = ocupa TODO el ancho de su contenedor (columna de un formulario). `false` = en línea (barra de filtros). */
  block?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1); // opción resaltada por teclado (-1 = ninguna)
  const selected = options.find((o) => o.value === value);
  const ql = q.trim().toLowerCase();
  const filtered = ql ? options.filter((o) => o.label.toLowerCase().includes(ql)) : options;
  // En modo texto libre, si el valor actual no está entre las sugerencias, se muestra tal cual.
  const displayLabel = selected ? selected.label : allowCustom && value ? value : emptyLabel ?? placeholder;
  const muted = !selected && !(allowCustom && value);
  // Fila para añadir el texto tecleado cuando no coincide exactamente con una sugerencia existente.
  const qTrim = q.trim();
  const showCustom = allowCustom && qTrim !== '' && !options.some((o) => o.label.toLowerCase() === qTrim.toLowerCase());

  function close() {
    setOpen(false);
    setQ('');
    setActive(-1);
  }
  function pick(v: string) {
    onChange(v);
    close();
  }

  // Lista de elementos navegables por teclado, EN EL ORDEN en que se renderizan (empty → custom → opciones).
  const items: Item[] = [];
  if (emptyLabel !== undefined) items.push({ value: '', label: emptyLabel });
  if (showCustom) items.push({ value: qTrim, label: t('select.useCustom', { value: qTrim }) });
  for (const o of filtered) items.push({ value: o.value, label: o.label });

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) pick(items[active]!.value);
      else if (allowCustom && qTrim) pick(qTrim); // fallback: texto libre sin navegar
      else if (filtered.length === 1) pick(filtered[0]!.value); // fallback: única coincidencia
    }
  }

  let idx = -1; // índice global para casar con `active` (mismo orden que `items`)
  return (
    // El contenedor fija el ancho (100 % en formulario, `min-w-56` en línea) y el botón lo ocupa entero: así el
    // campo NO cambia de tamaño según lo largo que sea el valor elegido, y el panel desplegable (`w-full`) cae
    // exactamente sobre él en vez de sobresalir por la derecha.
    <span className={`relative ${block ? 'block w-full' : 'inline-block min-w-56'}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex w-full items-center justify-between gap-2 rounded border border-line-strong bg-field px-2 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-50"
      >
        <span className={`truncate ${muted ? 'text-fg-subtle' : ''}`}>{displayLabel}</span>
        <span aria-hidden className="text-[0.6rem] opacity-60">▾</span>
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute left-0 z-20 mt-1 w-full rounded-lg border border-line bg-surface p-1 shadow-lg">
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="ss-listbox"
              aria-autocomplete="list"
              placeholder={allowCustom ? t('select.searchOrType') : t('select.filter')}
              className="mb-1 w-full rounded border border-line-strong bg-field px-2 py-1 text-sm"
            />
            <ul id="ss-listbox" role="listbox" className="max-h-60 overflow-y-auto">
              {items.map((it) => {
                idx += 1;
                const i = idx;
                return (
                  <li key={`${it.value}-${i}`} role="option" aria-selected={it.value === value}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(it.value)}
                      className={`w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-neutral-soft ${i === active ? 'bg-neutral-soft' : ''} ${it.value === value ? 'font-medium' : ''}`}
                    >
                      {it.label}
                    </button>
                  </li>
                );
              })}
              {items.length === 0 && <li className="px-2 py-1 text-xs text-fg-subtle">{t('select.noResults')}</li>}
            </ul>
          </div>
        </>
      )}
    </span>
  );
}
