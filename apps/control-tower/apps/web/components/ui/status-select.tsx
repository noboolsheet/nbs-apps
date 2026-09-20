'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { patchJson } from '@/lib/client';
import { statusTone, badgeBase } from './status-tone';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

/**
 * Estado EDITABLE inline (estilo Notion): una píldora con el color del estado + una flecha ▾ que indica que hay
 * más opciones. Al elegir una, hace PATCH al `endpoint` (campo `field`, por defecto "status") y refresca la vista.
 * Se usa igual en las listas y en el detalle. Reutiliza los colores del StatusBadge (status-tone).
 *
 * Implementación: la etiqueta coloreada es nuestra; encima va un `<select>` nativo INVISIBLE que ocupa toda la
 * píldora (accesible + sin problemas de recorte en tablas). Se puede clicar la píldora entera para desplegar.
 */
export function StatusSelect({
  endpoint,
  field = 'status',
  current,
  options,
}: {
  endpoint: string;
  field?: string;
  current: string;
  options: readonly string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cls, icon } = statusTone(current);

  async function change(value: string) {
    if (value === current) return;
    setBusy(true);
    setError(null);
    const res = await patchJson(endpoint, { [field]: value });
    setBusy(false);
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`relative ${badgeBase} ${cls} ${busy ? 'opacity-50' : ''}`} title={t('ui.cambiarEstado')}>
        <span aria-hidden className="inline-flex items-center gap-1">
          <span>{icon}</span>
          {enumLabel(current)}
          <span className="text-[0.6rem] opacity-70">▾</span>
        </span>
        <select
          value={current}
          disabled={busy}
          onChange={(e) => change(e.target.value)}
          aria-label={t('ui.cambiarEstado')}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
        >
          {options.map((s) => (
            <option key={s} value={s}>{enumLabel(s)}</option>
          ))}
        </select>
      </span>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
