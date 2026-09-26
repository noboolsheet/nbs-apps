'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { patchJson } from '@/lib/client';
import { enumLabel } from '@/lib/labels';
import { fieldCls } from './input';
import { t } from '@/lib/i18n';

/**
 * Sección de ficha con **edición inline por campo** (patrón elegido con el owner): NO hay botón "Editar".
 * En vista se muestran los campos campo→valor; al hacer **clic en el valor** de un campo editable se convierte
 * en su control (input/textarea/select) y los cambios se guardan al **pulsar Enter o salir del campo** (blur),
 * con un PATCH de ese único campo. **Escape** cancela. Los campos de solo lectura (`readOnly`) nunca se editan.
 * Reutilizable por cualquier entidad: se le pasa el endpoint y la config de campos.
 */
/** Opción de un select: cadena simple (value == label) o par explícito para relaciones (nombre→id). */
export type EditOption = string | { value: string; label: string };

export interface EditField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number';
  options?: readonly EditOption[];
  value: string | number | null | undefined;
  /** valor mostrado en modo vista (por defecto el string del value). */
  display?: string | null;
  /** Campo de solo lectura: no se edita ni se envía en el PATCH. `readOnlyHint` explica por qué (p. ej. origen externo). */
  readOnly?: boolean;
  readOnlyHint?: string;
  /** Texto de la opción "sin valor" de un select (por defecto «—»). P. ej. «Conservar siempre» en las retenciones. */
  emptyLabel?: string;
  /** Control extra a la derecha del valor (p. ej. el botón de purgar junto a su política de retención). */
  action?: ReactNode;
}

function optionValue(o: EditOption): string {
  return typeof o === 'string' ? o : o.value;
}
function optionLabel(o: EditOption): string {
  return typeof o === 'string' ? o : o.label;
}

/**
 * Caja COMPARTIDA por los dos estados del campo (vista y edición). Misma anchura, mismo padding, mismo borde y
 * misma tipografía: al hacer clic sólo cambian el color del borde y el fondo, nunca el tamaño. Antes la vista era
 * texto suelto con `px-1` y la edición un `input` con borde y `py-1.5`, así que el campo daba un salto al entrar y
 * otro al salir. `fieldCls` aporta el borde/fondo del control; aquí se replica su geometría exacta.
 */
const BOX = 'w-full rounded border px-2 py-1.5 text-sm';
const viewCls = `${BOX} border-transparent text-left hover:bg-surface-muted`;
const inputCls = `w-full ${fieldCls}`;
/** Alto mínimo del textarea, también en vista, para que el bloque no crezca al empezar a editar. */
const TEXTAREA_MIN = 'min-h-24';

export function InlineEditSection({
  title,
  endpoint,
  fields,
  canEdit = true,
}: {
  title?: string;
  endpoint: string;
  fields: EditField[];
  canEdit?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{title}</h2>}
      <dl className="flex flex-col divide-y divide-line-subtle">
        {fields.map((f) => (
          <div key={f.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
            {/* `py-1.5` = el mismo padding vertical que la caja del valor, para que etiqueta y valor queden alineados. */}
            <dt className="w-48 shrink-0 py-1.5 text-sm text-fg-muted">
              {f.label}
              {f.readOnly && <span className="ml-1 text-fg-subtle">🔒</span>}
            </dt>
            <dd className="flex min-w-0 flex-1 items-start gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <InlineField field={f} endpoint={endpoint} editable={canEdit && !f.readOnly} />
              </div>
              {f.action && <div className="shrink-0 pt-0.5">{f.action}</div>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Un campo: en vista muestra el valor; si es editable, clic → control, y guarda al Enter/blur (Escape cancela). */
function InlineField({ field, endpoint, editable }: { field: EditField; endpoint: string; editable: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipCommit = useRef(false);

  const initial = field.value == null ? '' : String(field.value);
  // El `display` explícito manda; si no, `enumLabel` traduce sólo los códigos de enum conocidos y deja el texto libre.
  const shown = field.display ?? (field.value == null ? '' : enumLabel(String(field.value)));

  function startEdit() {
    if (!editable || busy) return;
    setVal(initial);
    setError(null);
    skipCommit.current = false;
    setEditing(true);
  }

  async function commit(next: string) {
    if (skipCommit.current) {
      skipCommit.current = false;
      setEditing(false);
      return;
    }
    if (next === initial) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = { [field.name]: next === '' ? null : field.type === 'number' ? Number(next) : next };
    const res = await patchJson(endpoint, payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message); // se queda en edición para corregir
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function cancel() {
    skipCommit.current = true; // el blur que dispara el desmontaje no debe guardar
    setError(null);
    setEditing(false);
  }

  const isTextarea = field.type === 'textarea';

  // ── Vista de solo lectura ─────────────────────────────────────────────────────
  // Misma caja que el control (con borde transparente) para que un campo bloqueado no se vea "encogido"
  // respecto a los editables de al lado.
  if (!editable) {
    return (
      <>
        <div className={`${BOX} whitespace-pre-wrap border-transparent ${isTextarea ? TEXTAREA_MIN : ''}`}>
          {shown === '' ? <span className="text-fg-subtle">—</span> : shown}
        </div>
        {field.readOnly && field.readOnlyHint && (
          <p className="mt-0.5 px-2 text-xs text-fg-subtle">{field.readOnlyHint}</p>
        )}
      </>
    );
  }

  // ── Editable, en vista: clic para editar ──────────────────────────────────────
  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        title={t('panel.clickToEdit')}
        className={`block whitespace-pre-wrap ${viewCls} ${isTextarea ? TEXTAREA_MIN : ''}`}
      >
        {shown === '' ? <span className="text-fg-subtle">—</span> : shown}
      </button>
    );
  }

  // ── Editable, en edición: el control según el tipo ────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && field.type !== 'textarea') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur(); // el blur guarda (una sola vía)
    }
  };

  return (
    <>
      {field.type === 'textarea' ? (
        <textarea
          autoFocus
          className={`${inputCls} ${TEXTAREA_MIN}`}
          value={val}
          disabled={busy}
          onChange={(e) => setVal(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={onKeyDown}
        />
      ) : field.type === 'select' ? (
        <select
          autoFocus
          className={inputCls}
          value={val}
          disabled={busy}
          onChange={(e) => {
            setVal(e.target.value);
            void commit(e.target.value);
          }}
          onBlur={cancel}
        >
          <option value="">{field.emptyLabel ?? '—'}</option>
          {(field.options ?? []).map((o) => (
            <option key={optionValue(o)} value={optionValue(o)}>
              {enumLabel(optionLabel(o))}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          className={inputCls}
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          value={val}
          disabled={busy}
          onChange={(e) => setVal(e.target.value)}
          onBlur={(e) => void commit(e.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
      {error && <p className="mt-1 px-2 text-sm text-danger">{error}</p>}
    </>
  );
}
